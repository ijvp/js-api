const router = require('express').Router();
const { User } = require('../models/User');
const { decrypt } = require('../utils/crypto');
const logger = require('../utils/logger');
const { checkAuth, checkStoreExistence } = require('../utils/middleware');
const axios = require('axios');
const { differenceInDays, parseISO } = require('date-fns');
const { redisClient } = require('../om/redisClient');
const FacebookController = require('../controllers/facebook');
const { auth } = require('../middleware/auth');
const { storeExists } = require('../middleware/store');

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
    const token = await redisClient.hGet(`store:${store}`, 'fb_token');

    if (!token) {
      return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
    }

    let allAccounts = [];
    let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me/adaccounts?fields=name%2Cid%2Caccount_id&access_token=${token}`;

    while (url) {
      const { data: accounts } = await axios.get(url);
      allAccounts = allAccounts.concat(accounts.data);
      url = accounts.paging.next;
    }

    allAccounts.sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();

      if (nameA < nameB) {
        return -1;
      } else if (nameA > nameB) {
        return 1;
      } else {
        return 0;
      }
    });

    return res.status(200).json(allAccounts);
  } catch (error) {
    logger.error(error);
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

  if (!(account && store)) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  };

  try {
    await facebookController.createFacebookAdsAccount({ ...account, storeId: store });
    return res.status(201).json({
      success: true, message: `Facebook Ads account ${account.name} added to ${store}`
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  };
});

router.get("/facebook/account/disconnect", auth, checkStoreExistence, async (req, res) => {
  const { store } = req.query;

  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query' })
  };
  User.findOneAndUpdate(
    { _id: req.user._id, "shops.name": store },
    {
      $unset: {
        "shops.$.facebook_business": 1,
        "shops.$.facebook_access_token": 1
      },
    },
    { new: true },
    (err, user) => {
      if (err) {
        logger.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      } else {
        res.status(204).json({ success: true, message: `Removed Facebook Ads account from ${store}` });
      }
    }
  );
});

//Rota para buscar os gastos, e o roas de uma conta no facebook business
// Tem que ser enviado o id da loja, a rota usa o access token do usuario a rota usa o access token do usuário ao id do das cotas administradas pelo usuário logado 
// O startDate e o endDate tem que ser enviados no padrão yyyy-mm-dd
router.post("/facebook/ads", auth, async (req, res) => {
  const { store, start, end } = req.body;
  if (!store) {
    return res.status(400).send('Invalid request body, missing store')
  }

  if (!start && !end) {
    return res.status(400).send('Start date and end date must be set');
  }

  let shop = await req.user.shops.find((shop) => shop.name === store);
  if (!shop) {
    return res.status(404).send("Store not found")
  }

  if (!shop.facebook_business) {
    return res.status(404).send("No facebook business associated with this store");
  }

  const campaign = {
    id: 'facebook-ads.ads-metrics',
    metricsBreakdown: []
  };

  const isSingleDay = differenceInDays(parseISO(String(end)), parseISO(String(start))) === 0;
  const since = start.split("T")[0];
  const until = end.split("T")[0];

  let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${shop.facebook_business.id}/insights`;
  let params = {
    time_range: { since, until },
    level: "account",
    fields: "campaign_name,adset_name,ad_name,spend,purchase_roas",
    access_token: decrypt(shop.facebook_access_token)
  };

  if (!isSingleDay) {
    params.time_increment = 1;
  } else {
    params.breakdowns = "hourly_stats_aggregated_by_advertiser_time_zone";
  }

  try {
    do {
      const response = await axios.get(url, { params: params });
      let resData = response.data.data;
      resData.forEach(data => {
        let indexHour;
        if (isSingleDay) {
          indexHour = data.hourly_stats_aggregated_by_advertiser_time_zone.slice(0, 2);
        }

        const dailyDataDate = !isSingleDay ? `${data.date_start}` : `${data.date_start}T${indexHour}`;
        let dailyData = {
          date: dailyDataDate,
          metrics: {
            spend: parseFloat(data.spend),
          }
        }
        campaign.metricsBreakdown.push(dailyData);
      })
      url = response.data.paging?.next;
    } while (url);
  } catch (error) {
    logger.error(error.response.data.error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }

  res.status(200).json(campaign);
});

module.exports = router;
