const router = require('express').Router();
const logger = require('../utils/logger');
const axios = require('axios');
const { redis } = require('../clients');
const FacebookController = require('../controllers/facebook');
const { auth } = require('../middleware/auth');
const { storeExists } = require('../middleware/store');

const { redisClient } = redis;
const facebookController = new FacebookController(redisClient);

//Login facebook, quando usuário finalizar login chama a rota callback
router.get("/facebook/authorize", auth, async (req, res) => {
  const { store } = req.query;
  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query, missing store' })
  }
  return res.status(200).json(`https://www.facebook.com/${process.env.FACEBOOK_API_VERSION}/dialog/oauth?client_id=${process.env.FACEBOOK_API_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&scope=${process.env.FACEBOOK_API_SCOPES}&state=${store}`)
});

//Callback, usa o "code" que veio na requisição da rota de login(connect) para buscar o access token do usuário, com o access token buscamos o id do usuário. O access token e o id são salvos no banco de dados.
router.get("/facebook/callback", auth, async (req, res) => {
  const { code, state: shop } = req.query;

  await axios({
    method: 'get',
    url: `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/oauth/access_token?redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&client_id=${process.env.FACEBOOK_API_CLIENT_ID}&client_secret=${process.env.FACEBOOK_API_CLIENT_SECRET}&code=${code}`
  })
    .then(async response => {
      const clientId = await axios({
        method: "get",
        url: `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me?fields=id&access_token=${response.data.access_token}`
      })
        .then(response => response.data.id)
        .catch(error => {
          if (error.response) {
            return res.status(400).send(error.response.data.error);
          } else {
            return res.status(400).send(error);
          }
        });

      try {
        await facebookController.grantFacebookAccessToStore(shop, response.data.access_token);
        return res.redirect(`${process.env.FRONTEND_URL}/integrations?platform=facebook&store=${shop}`);
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
      };
    });
});

//Rota para buscar as contas administradas pelo usuário que fez o login, usamos o facebook_access_token do usuário logado para fazer a busca.
router.get("/facebook/accounts", auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    const accounts = await facebookController.fetchFacebookAccountList(store);
    return res.status(200).json(accounts);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  };
});

//Rota para buscar as contas que serão mostradas no dashboard
//Essa rota pode salvar várias contas facebook para lojas diferentes, o shopName serve para a rota buscar o shop correspondente.
// Body enviado
// "clientsIds": [
//     {
//         "shopName": string, nome da loja shopify,
//         "name": nome da loja no facebook,
//         "id": id na loja no facebook,
//         "account_id": account id na loja no facebook,
//     }
// ]
router.post("/facebook/account/connect", auth, storeExists, async (req, res) => {
  const { account, store } = req.body;
  if (!(account)) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  };

  try {
    await facebookController.createFacebookAdsAccount({ ...account, storeId: store });
    return res.status(201).json({
      success: true, message: `Facebook Ads account ${account.name} added to ${store}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

router.get("/facebook/account/disconnect", auth, storeExists, async (req, res) => {
  try {
    const { store } = req.query;
    await facebookController.deleteFacebookAdsAccount(store);
    return res.status(201).json({
      success: true, message: `Facebook Ads account disconnected from '${store}'`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

//Rota para buscar os gastos, e o roas de uma conta no facebook business
// Tem que ser enviado o id da loja, a rota usa o access token do usuario a rota usa o access token do usuário ao id do das cotas administradas pelo usuário logado 
// O startDate e o endDate tem que ser enviados no padrão yyyy-mm-dd
router.post("/facebook/ads", auth, storeExists, async (req, res) => {
  const { store, start, end } = req.body;

  if (!start && !end) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  try {
    const ads = await facebookController.fetchFacebookAds(store, start, end);
    return res.status(200).send({
      ...ads, metricsBreakdown: ads.metricsBreakdown.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      })
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  };
});

router.post("/facebook/campaigns", auth, storeExists, async (req, res) => {
  const { store } = req.body;

  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  try {
    const campaigns = await facebookController.fetchActiveFacebookCampaigns(store);
    return res.json(campaigns);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/facebook/ad-sets", auth, storeExists, async (req, res) => {
  const { store } = req.body;

  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  try {
    const adSets = [];
    const { data: campaigns } = await facebookController.fetchActiveFacebookCampaigns(store);

    const adSetsPromises = campaigns.map(async campaign => {
      const campaignAdSets = await facebookController.fetchFacebookCampaignAdSets(store, campaign.id);
      return { campaignId: campaign.id, adSets: campaignAdSets.data };
    });

    adSets.push(...await Promise.all(adSetsPromises));

    return res.json(adSets);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
})

module.exports = router;
