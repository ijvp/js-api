const router = require('express').Router();
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../helpers/crypto');
const axios = require('axios');
const { differenceInDays, parseISO } = require('date-fns');

//Login facebook, quando usuário finalizar login chama a rota callback
router.get("/facebook/authorize", async (req, res) => {
  const { store } = req.query;
  return res.status(200).json(`https://www.facebook.com/${process.env.FACEBOOK_API_VERSION}/dialog/oauth?client_id=${process.env.FACEBOOK_API_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&scope=${process.env.FACEBOOK_API_SCOPES}&state=${store}`)
});


//Callback, usa o "code" que veio na requisição da rota de login(connect) para buscar o access token do usuário, com o access token buscamos o id do usuário. O access token e o id são salvos no banco de dados.
router.get("/facebook/callback", async (req, res) => {
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
        console.log("shop not found for this user");
      } else {
        user.shops[shopIndex].facebook_access_token = accessToken;
        user.facebook_manager_id = clientId;
        user.markModified("shops");
        user.save(err => {
          if (err) console.log(err);
        });
      }

      return user;
    }).then(() => {
      res.redirect(`${process.env.FRONTEND_URL}?facebook_authorized=true&facebook_authorized_store=${state}`);
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


//Rota para buscar as contadas administradas pelo usuário que fez o login, usamos o facebook_access_token do usuário logado para fazer a busca.
router.get("/facebook/accounts", async (req, res) => {
  if (!req.user) {
    return res.status(401).send('User need to be logged in')
  }

  const encryptedToken = getToken(req, 'facebook', 'access');
  const token = decrypt(encryptedToken);

  User.findById(req.user._id).then(async user => {
    try {
      let allAccounts = [];

      let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me/adaccounts?fields=name%2Cid%2Caccount_id&access_token=${token}`;

      while (url) {
        const { data: accounts } = await axios.get(url);
        allAccounts = allAccounts.concat(accounts.data);
        url = accounts.paging.next;
      }

      return res.status(200).send(allAccounts);
    } catch (error) {
      console.log(error);
    }
  })
})


//Rota para salvar as costas que serão mostradas no dashboard
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

router.post("/facebook/account/connect", async (req, res) => {
  const { business, store } = req.body;

  if (!req.user) {
    return res.status(401).send('User need to be logged in')
  }

  await User.findById(req.user.id).then(async user => {
    const shop = user.shops.find((shop) => shop.name === store);

    if (!shop) {
      console.log(`A store with this name:${store} was not found for this user`);
    } else {
      shop.facebook_business = {
        business_id: business.account_id,
        business_name: business.name
      };
      user.markModified("shops");
      user.save(err => err && console.log(err))
    };

    res.status(200).json({
      success: true, message: `Facebook business ${business.name} added to ${store}`
    });
    // await clientsIds.forEach(async (clientId) => {
    //   let shopExists

    //   try {
    //     shopExists = user.shops.find((shop) => shop.name === clientId.shopName);

    //     if (shopExists) {

    //       const shopClientExists = shopExists.facebook_clients.find((shopClient) => decrypt(shopClient.facebook_client_id) === clientId.id
    //       )

    //       if (shopClientExists) {
    //         if (shopClientExists.facebook_client_name !== clientId.name) {
    //           shopClientExists.facebook_client_name = clientId.name;
    //         }
    //       } else {
    //         shopExists.facebook_clients.push({
    //           facebook_client_id: encrypt(clientId.id),
    //           facebook_client_name: clientId.name,
    //         })
    //       }
    //     }
    //   } catch (error) {
    //     console.log(error)
    //   }
    // })

    // if (user !== undefined) {

    //   user.markModified("User");
    //   return user.save(() => {
    //     res.status(200).json({ message: 'new clients added' });
    //   })
    // } else {
    //   return res.status(404).send("user not find")
    // }

  })

})

router.get("/facebook/account/disconnect", async (req, res) => {
  const { store } = req.query;

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
        console.log(err);
      } else {
        const shop = user.shops.find(shop => shop.name === store);
        console.log(shop);
      }
    }
  );

  res.status(200).json({ success: true, message: `Removed Facebook Ads account from ${store}` });
});

//Rota para buscar os gastos, e o roas de uma conta no facebook business
// Tem que ser enviado o id da loja, a rota usa o access token do usuario a rota usa o access token do usuário ao id do das cotas administradas pelo usuário logado 
// O startDate e o endDate tem que ser enviados no padrão yyyy-mm-dd
router.post("/facebook/ads", async (req, res) => {
  const { shopName, startDate, endDate } = req.body;

  if (!req.user) {
    return res.status(401).send('User need to be logged in');
  }

  if (!startDate || !endDate) {
    return res.status(400).send('Start date and end date must be filled');
  }

  if (!shopName) {
    return res.status(400).send("Shop name must be filled")
  }

  let userData = req.user;

  let shop = await userData.shops.find((shop) => shop.name === shopName);

  if (!shop) {
    return res.status(404).send("Shop not found or user does not have permission")
  }

  if (!shop.facebook_business) {
    res.status(404).send("No facebook business associated with this store");
  }

  const campaign = {
    id: 'facebook-ads.ads-metrics',
    metricsBreakdown: []
  };

  const isSingleDay = differenceInDays(parseISO(String(endDate)), parseISO(String(startDate))) === 0;
  const start = startDate.split("T")[0];
  const end = endDate.split("T")[0];

  let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/act_${shop.facebook_business.business_id}/insights`;
  let params = {
    time_range: { since: start, until: end },
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
    console.log(error.response.data);
  }

  res.status(200).json(campaign);
});

module.exports = router;
