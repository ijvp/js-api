const router = require('express').Router();
const { User } = require('../models/User');
const logger = require('../utils/logger');
const { checkAuth, checkStoreExistence } = require('../utils/middleware');
const { auth } = require('../middleware/auth');
const { google } = require('googleapis');
const { GoogleAdsApi } = require('google-ads-api');
const { differenceInDays, parseISO } = require('date-fns');
const { redisClient } = require('../om/redisClient');
const GoogleController = require('../controllers/google');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, TOKEN_GOOGLE } = process.env;

const googleController = new GoogleController(redisClient);

const oauth2Client = new google.auth.OAuth2(
  `${GOOGLE_CLIENT_ID}`,
  `${GOOGLE_CLIENT_SECRET}`,
  `${GOOGLE_REDIRECT_URL}`
);

const client = new GoogleAdsApi({
  client_id: `${process.env.GOOGLE_CLIENT_ID}`,
  client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
  developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
});

//Generate google oAuth url and send it back to the client
//and send the selected store in state variable
router.get('/google/authorize', auth, async (req, res) => {
  const { store } = req.query;
  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query, missing store' })
  }

  let redirect = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/adwords'
    ],
    state: store,
    include_granted_scopes: true
  });

  return res.status(200).json(redirect);
});

//Associate access and refresh tokens to a store, which is sent
//back in the state
router.get('/google/callback', auth, (req, res) => {
  const { code, state: shop } = req.query;

  oauth2Client.getToken(code, async (error, token) => {
    if (error) {
      return res.status(400).send(`Error while trying to retrieve access token: ${error}`);
    } else {
      try {
        await googleController.grantGoogleAccessToStore(shop, token);
        return res.redirect(`${process.env.FRONTEND_URL}/integrations?platform=google&store=${shop}`);
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" })
      }
    };
  });
});

//Connect a google account to one of the users shops
router.post("/google/account/connect", auth, checkStoreExistence, async (req, res) => {
  const { account } = req.body;
  if (!(account)) {
    return res.status(400).send({ success: false, message: 'Invalid request body' });
  }

  try {
    const userId = req.user._id;
    const userStores = await redisClient.sMembers(`user_stores:${userId}`);
    const found = userStores.find(store => store === store);
    if (found) {
      await redisClient.hSet(`store:${store}`, 'google_id', account.id);
      await redisClient.hSet(`store:${store}`, 'google_name', account.name);

      return res.status(201).json({
        success: true, message: `Google Ads account ${account.name} added to ${store}`
      });
    } else {
      return res.status(404).json({ success: false, error: "Store not found" })
    }

  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//Disconnects google account from a user's shop
router.get('/google/account/disconnect', auth, checkStoreExistence, async (req, res) => {
  try {
    const userId = req.user._id;
    const userStores = await redisClient.sMembers(`user_stores:${userId}`);
    const found = userStores.find(store => store === store);
    if (found) {
      await redisClient.hDel(`store:${store}`, 'google_id');
      await redisClient.hDel(`store:${store}`, 'google_name');

      return res.status(201).json({
        success: true, message: `Google Ads account disconnected from ${store}`
      });
    } else {
      return res.status(404).json({ success: false, error: "Store not found" })
    };

  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

//Gets all Google Ads account associated with authorized Google account
router.get('/google/accounts', auth, checkStoreExistence, async (req, res) => {
  try {
    const { store } = req.query;
    const token = await redisClient.hGet(`store:${store}`, 'google_refresh_token')

    if (!token) {
      return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
    }

    const customerResourceNames = await client.listAccessibleCustomers(token).then(response => response.resource_names);
    const allAccounts = await Promise.all(customerResourceNames.map(async (resourceName) => {
      const customerId = resourceName.split('customers/')[1];
      const accountList = client.Customer({
        customer_id: customerId,
        refresh_token: token,
      });

      try {
        const response = await accountList.report({
          entity: 'customer_client',
          attributes: ['customer_client.id', 'customer_client.resource_name', 'customer_client.descriptive_name'],
        });

        return response.filter(account => account.customer_client.id.toString() === customerId)[0].customer_client;
      } catch (error) {
        return 'error'
      }
    }));

    allAccounts.sort((a, b) => {
      const nameA = a.descriptive_name.toUpperCase();
      const nameB = b.descriptive_name.toUpperCase();

      if (nameA < nameB) {
        return -1;
      } else if (nameA > nameB) {
        return 1;
      } else {
        return 0;
      }
    });

    logger.info(allAccounts);
    res.status(200).json(allAccounts);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Save google_manager_id to req.user
router.post("/google/accounts/manager", checkAuth, async (req, res) => {
  const { managerId } = req.body;

  User.findById(req.user._id).then(user => {
    user.google_manager_id = managerId;

    user.markModified("User");
    user.save(err => {
      if (err) logger.error(err);
    })

    return user;
  }).then((response) => {
    return res.status(200).json(response);
  }).catch((error) => {
    return res.status(400).send(error);
  })
});

router.post("/google/ads", checkAuth, checkStoreExistence, async (req, res) => {
  const { start, end, store } = req.body;

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  };

  try {
    const { google_refresh_token: token, google_id: googleId } = await redisClient.hGetAll(`store:${store}`, 'google_refresh_token');
    if (!googleId) {
      return res.status(404).send('No Google Ads account associated with this store');
    };

    const account = client.Customer({
      customer_id: googleId,
      refresh_token: token,
    });

    const isSingleDay = differenceInDays(parseISO(String(end)), parseISO(String(start)));
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];

    await account.report({
      from_date: startDate,
      to_date: endDate,
      segments: isSingleDay === 0 ? ["segments.hour"] : ["segments.date"],
      entity: "campaign",
      attributes: [
        "campaign.id",
        "campaign.name"
      ],
      metrics: [
        "metrics.cost_micros"
      ]
    })
      .then(data => {
        let metrics = {
          id: "google-ads.ads-metrics",
          metricsBreakdown: []
        }

        data.forEach(ad => {
          let dateKey;
          if (!isSingleDay) {
            const campaignHour = ad.segments.hour < 10 ? `0${ad.segments.hour}` : `${ad.segments.hour}`;
            const utcDate = new Date(Date.parse(start));
            const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60 * 1000));
            const localDateTime = new Date(`${localDate.toISOString().substring(0, 10)}T${campaignHour}:00:00`);
            dateKey = localDateTime.toISOString().slice(0, -11);
          } else {
            dateKey = ad.segments.date;
          }

          const dateExists = metrics.metricsBreakdown.find((byDate) => byDate.date === dateKey);

          if (dateExists) {
            dateExists.metrics.spend += ad.metrics.cost_micros / 1000000;
          } else {
            const dayDate = {
              date: dateKey,
              metrics: {
                spend: ad.metrics.cost_micros / 1000000
              }
            }
            metrics.metricsBreakdown.push(dayDate);
          }
        });

        return res.status(200).json(metrics);
      })
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  };
});

module.exports = router;
