const router = require('express').Router();
const logger = require('../utils/logger');
const { storeExists } = require('../middleware/store');
const { auth } = require('../middleware/auth');
const { google } = require('googleapis');
const { redis } = require('../clients');
const GoogleController = require('../controllers/google');
const axios = require('axios');

const { redisClient } = redis;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, TOKEN_GOOGLE } = process.env;

const googleController = new GoogleController(redisClient);

const oauth2Client = new google.auth.OAuth2(
  `${GOOGLE_CLIENT_ID}`,
  `${GOOGLE_CLIENT_SECRET}`,
  `${GOOGLE_REDIRECT_URL}`
);

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
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//Disconnects google account from a user's shop
router.get('/google/account/disconnect', auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    await googleController.deleteGoogleAdsAcccount(store);
    return res.status(201).json({
      success: true, message: `Google Ads account disconnected from '${store}'`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

//Gets all Google Ads account associated with authorized Google account
router.get('/google/accounts', auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    const accounts = await googleController.fetchGoogleAdsAccountList(store);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post("/google/ads", auth, storeExists, async (req, res) => {
  const { start, end, store } = req.body;

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  };

  try {
    const response = await axios.post(`${process.env.PYEND_URL}/google/ads`, {
      store: store,
      start,
      end
    })


    // tem que reordenar aqui por algum motivo, mesmo o python devolvendo em ordem...
    return res.status(200).send({
      ...response.data, metricsBreakdown: response.data.metricsBreakdown.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      })
    });

  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  };
});

module.exports = router;
