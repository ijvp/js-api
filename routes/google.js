const router = require('express').Router();
const logger = require('../utils/logger');
const { storeExists } = require('../middleware/store');
const { auth } = require('../middleware/auth');
const { google } = require('googleapis');
const { redis } = require('../clients');
const GoogleController = require('../controllers/google');
const axios = require('axios');
const { differenceInDays, endOfToday, startOfToday } = require('date-fns');
const { getTimePeriodString } = require('../utils/google')
const { formatGoogleDateRange } = require('../utils/date');

const { redisClient } = redis;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, TOKEN_GOOGLE } = process.env;

const googleController = new GoogleController(redisClient);

let oauth2Client;

const GOOGLE_SCOPES = {
  'google-ads': 'https://www.googleapis.com/auth/adwords',
  'google-analytics': 'https://www.googleapis.com/auth/analytics.readonly'
};

router.get('/google/supported-apis', (req, res) => {
  const apis = google.getSupportedAPIs();
  return res.json(apis);
});

//Generate google oAuth url and send it back to the client
//and send the selected store in state variable
router.get('/google/authorize', auth, async (req, res) => {
  const { store, service } = req.query;

  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query, missing store' })
  }

  oauth2Client = new google.auth.OAuth2(
    `${GOOGLE_CLIENT_ID}`,
    `${GOOGLE_CLIENT_SECRET}`,
    `${process.env.URL}/${service}/callback`
  );

  let redirect = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      GOOGLE_SCOPES[service]
    ],
    state: store,
    include_granted_scopes: true
  });

  return res.status(200).json(redirect);
});

// Associate google ads access and refresh tokens to a store
router.get('/google-ads/callback', auth, (req, res) => {
  const { code, state: shop } = req.query;

  oauth2Client.getToken(code, async (error, token) => {
    if (error) {
      return res.status(500).json({ success: false, error });
    };

    try {
      await googleController.grantGoogleAdsAccessToStore(shop, token);
      return res.redirect(`${process.env.FRONTEND_URL}/integracoes?platform=google-ads&store=${shop}`);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  });
});

//Connect a google Ads account to one of the users shops
router.post("/google-ads/account/connect", auth, storeExists, async (req, res) => {
  const { account, store } = req.body;
  if (!(account)) {
    return res.status(400).send({ success: false, message: 'Invalid request body' });
  }

  try {
    await googleController.storeGoogleAdsAccount({ ...account, storeId: store });
    return res.status(201).json({
      success: true, message: `Google Ads account ${account.name} added to ${store}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//Disconnects google Ads account from a user's shop
router.get('/google-ads/account/disconnect', auth, storeExists, async (req, res) => {
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
router.get('/google-ads/accounts', auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    const accounts = await googleController.fetchGoogleAdsAccountList(store);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post("/google-ads/ad-expenses", auth, storeExists, async (req, res) => {
  const { start, end, store, granularity } = req.body;

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  };

  const difference = differenceInDays(new Date(), new Date(start))

  const isEndToday = differenceInDays(new Date(end), endOfToday()) === 0
  const isYESTERDAY = differenceInDays(new Date(end), startOfToday()) === 0
  const isTodayOrYESTERDAY = isEndToday || isYESTERDAY

  let dateRange = getTimePeriodString({ difference, isTodayOrYESTERDAY })

  try {
    const response = await axios.post(`${process.env.PYEND_URL}/google-ads/ads`, {
      store: store,
      start,
      end,
      dateRange
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

// Associate google analytics access and refresh tokens to a store
router.get('/google-analytics/callback', auth, (req, res) => {
  const { code, state: shop } = req.query;

  oauth2Client.getToken(code, async (error, token) => {
    if (error) {
      return res.status(500).json({ success: false, error });
    };

    try {
      await googleController.grantGoogleAnalyticsAccessToStore(shop, token);
      return res.redirect(`${process.env.FRONTEND_URL}/integracoes?platform=google-analytics&store=${shop}`);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  });
});

//Connect a google Analytics account to one of the users shops
router.post("/google-analytics/account/connect", auth, storeExists, async (req, res) => {
  const { account, store } = req.body;
  if (!(account)) {
    return res.status(400).send({ success: false, message: 'Invalid request body' });
  }

  try {
    await googleController.storeGoogleAnalyticsProperty({ ...account, storeId: store });
    return res.status(201).json({
      success: true, message: `Google Ads account ${account.name} added to ${store}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//Disconnects google Analytics account from a user's shop
router.get('/google-analytics/account/disconnect', auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    await googleController.deleteGoogleAnalyticsProperty(store);
    return res.status(201).json({
      success: true, message: `Google Ads account disconnected from '${store}'`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

router.get('/google-analytics/accounts', auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    const accounts = await googleController.fetchGoogleAnalyticsPropertiesList(store);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/google-analytics/product-sessions', auth, storeExists, async (req, res) => {
  try {
    const { store, start, end } = req.query;
    const dateRange = formatGoogleDateRange(start, end);
    const productPageSessions = await googleController.fetchProductPageSessions(store, dateRange);
    res.status(200).json(productPageSessions);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/date-range', (req, res) => {
  const { start, end } = req.query;

  res.json(formatGoogleDateRange(start, end));
});

module.exports = router;
