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
const { storeExists } = require('../middleware/store');
const axios = require('axios');

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
      return res.status(400).json({ success: false, error });
    };

    try {
      console.log(token)
      await googleController.grantGoogleAccessToStore(shop, token);
      return res.redirect(`${process.env.FRONTEND_URL}/integrations?platform=google&store=${shop}`);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  });
});

//Connect a google account to one of the users shops
router.post("/google/account/connect", auth, storeExists, async (req, res) => {
  const { account, store } = req.body;
  if (!(account)) {
    return res.status(400).send({ success: false, message: 'Invalid request body' });
  }

  try {
    await googleController.createGoogleAdsAccount({ ...account, storeId: store });
    return res.status(201).json({
      success: true, message: `Google Ads account ${account.name} added to ${store}`
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//Disconnects google account from a user's shop
router.get('/google/account/disconnect', auth, checkStoreExistence, async (req, res) => {
  try {
    const userId = req.session.userId;
    const store = req.method === 'POST' ? req.body.store : req.query.store;

    const userStores = await redisClient.smembers(`user_stores:${userId}`);
    const found = userStores.find(store => store === store);
    if (found) {
      await redisClient.hdel(`store:${store}`, 'googleAccessToken');
      await redisClient.hdel(`store:${store}`, 'googleRefreshToken');
      await redisClient.del(`google_ads_account:${store}`)

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
    const accounts = await googleController.fetchGoogleAdsAccountList(store);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post("/google/ads", auth, checkStoreExistence, async (req, res) => {
  const { start, end, store } = req.body;

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  };

  const startDate = start.split("T")[0];  
  const endDate = end.split("T")[0];

  try {
    const response = await axios.post(`${process.env.PYEND_URL}/google/ads?store=${store}&start=${startDate}&end=${endDate}`)

    return res.status(200).send(response.data)
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  };
});

module.exports = router;
