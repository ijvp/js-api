const router = require('express').Router();
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../helpers/crypto');
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
  let redirect = oauth2Client.generateAuthUrl({
    access_type: 'offline',
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
            console.log("shop not found for this user");
          } else {
            user.shops[shopIndex].google_access_token = accessToken;
            user.shops[shopIndex].google_refresh_token = refreshToken;
            user.markModified("shops");
            user.save(err => {
              if (err) console.log(err);
            });
          }
        })
        .catch(err => console.log(err));

      res.redirect(`${process.env.FRONTEND_URL}?google_authorized=true&google_authorized_store=${state}`);
    };
  });
});

//Connect a google account to one of the users shops
router.post("/google/account/connect", (req, res) => {
  const { client, store } = req.body;
  User.findById(req.user._id).then(user => {
    const shop = user.shops.find((shop) => shop.name === store);

    if (!shop) {
      console.log(`A store with this name:${store} was not found for this user`)
    } else {
      shop.google_client = {
        client_id: client.id,
        client_name: client.descriptive_name
      };
      user.markModified("shops");
      user.save(err => {
        if (err) console.log(err);
      });
    }
  });

  res.status(200).json({
    success: true, message: `Google Ads account ${client.descriptive_name} added to ${store}`
  });
});

//Disconnects google account from a user's shop
router.get('/google/account/disconnect', async (req, res) => {
  const { store } = req.query;

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
    (err, user) => {
      if (err) {
        console.log(err);
      } else {
        const shop = user.shops.find(shop => shop.name === store);
        console.log(shop);
      }
    }
  );

  res.status(200).json({ success: true, message: `Removed Google Ads account from ${store}` });
});

//Gets all Google Ads account associated with authorized Google account
router.get('/google/accounts', async (req, res) => {
  if (!req.user) {
    return res.status(401).send('User need to be logged in')
  }

  const encryptedToken = getToken(req, 'google', 'refresh');
  const token = decrypt(encryptedToken);

  console.log("encryptedToken", encryptedToken);
  console.log("token", token);
  const customers = await client.listAccessibleCustomers(token).then(response => {
    return response.resource_names;
  }).catch(error => {
    console.log(error.details);
  });

  const managerIdList = [];
  const promises = customers.map(async (resourceName) => {

    const customerId = `${resourceName.split('customers/')[1]}`;

    const accountList = client.Customer({
      customer_id: customerId,
      refresh_token: `${token}`,
    });

    return await accountList.report({
      entity: 'customer_client',
      attributes: ['customer_client.id', 'customer_client.resource_name', 'customer_client.descriptive_name'],
    }).then(response => {
      response.map((account) => {
        if (account.customer_client.id.toString() === customerId) {
          managerIdList.push(account.customer_client);
        }
      })
    }).catch(error => {
      console.log(error)
    });
  })

  await Promise.all(promises);

  return res.status(200).json(managerIdList)
})

//Save google_manager_id to req.user
router.post("/google/accounts/manager", async (req, res) => {
  const { managerId } = req.body;

  if (!req.user) {
    return res.status(401).send('User need to be logged in')
  }

  User.findById(req.user._id).then(user => {
    user.google_manager_id = managerId;

    user.markModified("User");
    user.save(err => {
      if (err) console.log(err);
    })

    return user;
  }).then((response) => {
    return res.status(200).json(response);
  }).catch((error) => {
    return res.status(400).send(error);
  })
});

router.post("/google/ads", async (req, res) => {
  const { startDate, endDate, shopName } = req.body;

  if (!req.user) {
    return res.status(401).send('User need to be logged in');
  }

  if (req.user.shops.length === 0) {
    return res.status(400).send('No shop found');
  }

  if (!startDate && !endDate) {
    return res.status(400).send("Start date and end date must be set");
  }

  let shop = await req.user.shops.find((shop) => shop.name === shopName);

  if (!shop) {
    return res.status(404).send("Shop not found or does not have permission");
  }

  if (!shop.google_client) {
    return res.status(404).send("No clients found");
  }

  const account = client.Customer({
    customer_id: `${shop.google_client.client_id}`,
    refresh_token: `${decrypt(shop.google_refresh_token)
      }`,
  });

  const isSingleDay = differenceInDays(parseISO(String(endDate)), parseISO(String(startDate)));
  const start = startDate.split("T")[0];
  const end = endDate.split("T")[0];

  await account.report({
    from_date: start,
    to_date: end,
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
          const utcDate = new Date(Date.parse(startDate));
          const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60 * 1000));
          const localDateTime = new Date(`${localDate.toISOString().substring(0, 10)}T${campaignHour}:00:00`);
          dateKey = localDateTime.toISOString();
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
      console.log(error)
    })
});

module.exports = router;
