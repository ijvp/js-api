const router = require('express').Router();
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../utils/crypto');
const logger = require('../utils/logger');
const { checkAuth } = require('../utils/user');
const { google } = require('googleapis');
const { GoogleAdsApi } = require('google-ads-api');
const { differenceInDays, parseISO } = require('date-fns');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, TOKEN_GOOGLE } = process.env;

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
router.get('/google/authorize', async (req, res) => {
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
router.get('/google/callback', (req, res) => {
  const { code, state } = req.query;

  oauth2Client.getToken(code, async (error, token) => {
    if (error) {
      return res.status(400).send(`Error while trying to retrieve access token: ${error}`);
    } else {
      User.findOne({ _id: req.user._id })
        .then(user => {
          const shopIndex = user.shops.findIndex(shop => shop.name === state);
          const accessToken = encrypt(token.access_token);
          const refreshToken = encrypt(token.refresh_token);
          if (shopIndex < 0) {
            logger.info("No stores associated with this user")
          } else {
            user.shops[shopIndex].google_access_token = accessToken;
            user.shops[shopIndex].google_refresh_token = refreshToken;
            user.markModified("shops");
            user.save(err => {
              if (err) logger.error(err);
            });
          }
        })
        .catch(err => logger.error(err));

      res.redirect(`${process.env.FRONTEND_URL}/integrations?platform=google&store=${state}`);
    };
  });
});

//Connect a google account to one of the users shops
router.post("/google/account/connect", checkAuth, (req, res) => {
  console.log('/google/account/connect', req.body)
  const { client, store } = req.body;
  if (!(client && store)) {
    return res.status(400).send({ success: false, message: 'Invalid request body' });
  }

  User.findById(req.user._id).then(user => {
    const shop = user.shops.find((shop) => shop.name === store);

    if (!shop) {
      return res.status(404).json({ success: false, message: `Store ${store} not found` });
    } else {
      shop.google_client = {
        client_id: client.id,
        client_name: client.descriptive_name
      };
      user.markModified("shops");
      user.save(err => {
        if (err) {
          logger.error(err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        } else {
          res.status(201).json({
            success: true, message: `Google Ads account ${client.descriptive_name} added to ${store}`
          });
        }
      });
    }
  });
});

//Disconnects google account from a user's shop
router.get('/google/account/disconnect', checkAuth, async (req, res) => {
  console.log('/google/account/disconnect', req.query)
  const { store } = req.query;

  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query' })
  }
  User.findOneAndUpdate(
    { _id: req.user._id, "shops.name": store },
    {
      $unset: {
        "shops.$.google_client": 1,
        "shops.$.google_access_token": 1,
        "shops.$.google_refresh_token": 1
      },
    },
    { new: true },
    (err) => {
      if (err) {
        logger.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      } else {
        res.status(204).json({ success: true, message: `Removed Google Ads account from ${store}` });
      }
    }
  );
});

//Gets all Google Ads account associated with authorized Google account
router.get('/google/accounts', checkAuth, async (req, res) => {
  try {
    const encryptedToken = getToken(req, 'google', 'refresh');
    const token = decrypt(encryptedToken);

    if (!token) {
      return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
    }

    const customerResourceNames = await client.listAccessibleCustomers(token).then(response => response.resource_names);

    const managerIdList = await Promise.all(customerResourceNames.map(async (resourceName) => {
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

    res.status(200).json(managerIdList);
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

router.post("/google/ads", checkAuth, async (req, res) => {
  const { start, end, store } = req.body;
  if (!store) {
    return res.status(400).send('Invalid request body, missing store')
  }

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  }

  let shop = await req.user.shops.find((shop) => shop.name === store);
  if (!shop) {
    return res.status(404).send('Store not found');
  }

  if (!shop.google_client) {
    return res.status(404).send('No client associated with this store');
  }

  const account = client.Customer({
    customer_id: `${shop.google_client.client_id}`,
    refresh_token: `${decrypt(shop.google_refresh_token)
      }`,
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
      })

      return res.status(200).json(metrics);
    })
    .catch(error => {
      logger.error(error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    });
});

module.exports = router;
