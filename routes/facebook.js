const router = require('express').Router();
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../utils/crypto');
const logger = require('../utils/logger');
const { checkAuth } = require('../utils/user');
const axios = require('axios');
const { differenceInDays, parseISO } = require('date-fns');

//Login facebook, quando usuário finalizar login chama a rota callback
router.get("/facebook/authorize", checkAuth, async (req, res) => {
  const { store } = req.query;
  if (!store) {
    return res.status(400).json({ success: false, message: 'Invalid request query, missing store' })
  }
  return res.status(200).json(`https://www.facebook.com/${process.env.FACEBOOK_API_VERSION}/dialog/oauth?client_id=${process.env.FACEBOOK_API_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&scope=${process.env.FACEBOOK_API_SCOPES}&state=${store}`)
});


//Callback, usa o "code" que veio na requisição da rota de login(connect) para buscar o access token do usuário, com o access token buscamos o id do usuário. O access token e o id são salvos no banco de dados.
router.get("/facebook/callback", checkAuth, async (req, res) => {
  const { code, state } = req.query;
  await axios({
    method: 'get',
    url: `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/oauth/access_token?redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&client_id=${process.env.FACEBOOK_API_CLIENT_ID}&client_secret=${process.env.FACEBOOK_API_CLIENT_SECRET}&code=${code}`
  }).then(async response => {

    const clientId = await axios({
      method: "get",
      url: `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me?fields=id&access_token=${response.data.access_token}`
    }).then(response => {
      return response.data.id;
    }).catch(error => {
      if (error.response) {
        return res.status(400).send(error.response.data.error);
      } else {
        return res.status(400).send(error);
      }
    });

    await User.findOne({ _id: req.user._id }).then(user => {
      const shopIndex = user.shops.findIndex(shop => shop.name === state);
      const accessToken = encrypt(response.data.access_token);

      if (shopIndex < 0) {
        logger.error("shop not found for this user");
      } else {
        user.shops[shopIndex].facebook_access_token = accessToken;
        user.facebook_manager_id = clientId;
        user.markModified("shops");
        user.save(err => {
          if (err) logger.error(err);
        });
      }

      return user;
    }).then(() => {
      res.redirect(`${process.env.FRONTEND_URL}/integrations?platform=facebook&store=${state}`);
    }).catch((error) => {
      return res.status(400).send(error);
    })
  }).catch(error => {
    if (error.response) {
      return res.status(400).send(error.response.data.error);
    } else {
      return res.status(400).send(error);
    }
  });
});


//Rota para buscar as contas administradas pelo usuário que fez o login, usamos o facebook_access_token do usuário logado para fazer a busca.
router.get("/facebook/accounts", checkAuth, async (req, res) => {
  const encryptedToken = getToken(req, 'facebook', 'access');
  const token = decrypt(encryptedToken);
  if (!token) {
    return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
  }

  User.findById(req.user._id).then(async user => {
    try {
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
    }
  })
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
router.post("/facebook/account/connect", checkAuth, async (req, res) => {
  const { account, store } = req.body;

  if (!(account && store)) {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  await User.findById(req.user.id).then(async user => {
    const shop = user.shops.find((shop) => shop.name === store);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Store not found' })
    } else {
      shop.facebook_business = {
        id: account.id,
        name: account.name
      };
      user.markModified("shops");
      user.save(err => {
        if (err) {
          logger.error(err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        } else {
          res.status(201).json({
            success: true, message: `Facebook business account ${account.name} added to ${store}`
          });
        }
      });
    };
  })

});

router.get("/facebook/account/disconnect", checkAuth, async (req, res) => {
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
router.post("/facebook/ads", checkAuth, async (req, res) => {
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
