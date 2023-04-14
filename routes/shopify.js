const router = require('express').Router();
const axios = require('axios');
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../helpers/crypto');
const { getStoreApiURL, getMetrics, extractHttpsUrl } = require('../helpers/shop');
const moment = require('moment');

const localState = 'n159-uimp02430u18r4bnty3920b1y382458';
const { SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
const scope = 'read_orders,read_customers,read_all_orders';

//TODO: how to create a reusable axios instance here if the shop name always comes as a request parameter?

router.get('/shopify/authorize', (req, res) => {
	const redirectUri = `${process.env.BACKEND_URL}/shopify/callback`;
	const authorizationUrl = 'https://accounts.shopify.com/store-login?redirect=' + encodeURIComponent(`/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${localState}`);
	res.redirect(authorizationUrl);
});

//accepts store url and access token, and saves to current user
//this endpoint is used by the custom app architecture where
//an individual app must be created for each store inside the Shopify Admin panel
router.post('/shopify/connect', (req, res) => {
	const { store, access_token } = req.body;

	if (!store) {
		res.status(400).send("Missing store parameter");
	}

	if (!access_token) {
		res.status(400).send("Missing access token");
	}

	User.findById(req.user._id)
		.then(user => {
			if (!user.shops) user.shops = [];
			const encryptedToken = encrypt(access_token);
			user.shops.push({
				name: store,
				shopify_access_token: encryptedToken
			});
			user.markModified("shops");
			user.save(err => {
				if (err) {
					console.log(err);
				} else {
					res.status(200).send("Loja adicionada com sucesso");
				}
			})
		});
});

router.get('/shopify/callback', (req, res, next) => {
	const { code, hmac, state, shop } = req.query;

	//TODO: hmac, state, shop-regex security checks
	if (state === localState) {
		console.log(req)
		axios.post(`https://${shop}/admin/oauth/access_token?client_id=${SHOPIFY_CLIENT_ID}&client_secret=${SHOPIFY_CLIENT_SECRET}&code=${code}`)
			.then(res => User.findOne({ _id: req.user._id })
				.then(user => {
					console.log(user);
					if (!user.shops) user.shops = [];
					const shopIndex = user.shops.findIndex(shop => {
						return shop.name === req.query.shop;
					});
					const encryptedToken = encrypt(res.data.access_token)
					if (shopIndex >= 0) {
						user.shops[shopIndex].shopify_access_token = encryptedToken;
					} else {
						user.shops.push({
							name: req.query.shop,
							shopify_access_token: encryptedToken
						});
					}
					//Does not update access token without this line
					//TODO: further investigate diff between find() ==> save() and findOneAndUpdate()
					user.markModified("shops");
					user.save(err => {
						if (err) console.log(err);
					})
				})
			)
			.catch(err => console.error(err));

		res.redirect(process.env.FRONTEND_URL);
	} else {
		res.status(401).send('Security check failed, check state, hmac, or shop parameter');
	}
});

router.post('/shopify/abandoned-checkouts', (req, res) => {
	const shopifyAccessToken = getToken(req, 'shopify');
	const { store, start, end, granularity } = req.body;

	let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;

	if (shopifyAccessToken) {
		axios.get(`${getStoreApiURL(req.body.store)}/checkouts.json`, {
			params: {
				created_at_max: endIncremented,
				limit: 250
			},
			headers: {
				'X-Shopify-Access-Token': decrypt(shopifyAccessToken)
			}
		})
			.then(response => {
				console.log(response);
				res.status(200).json(response.data);
				// res.status(200).json({
				// 	id: 'shopify.abandoned-checkout-metrics',
				// 	metricsBreakdown: getMetrics(response.data.checkouts, granularity)
				// });
			})
			.catch(error => console.log(error));
	}
});

//currently only returns paid orders
//parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
//triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
router.post('/shopify/orders', (req, res) => {
	const shopifyAccessToken = getToken(req, 'shopify');
	const { store, start, end, granularity } = req.body;

	if (shopifyAccessToken) {
		//frontend will set start and end to the same date for a single day of data, granularity must be 'hour'!
		let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;
		let allOrders = [];
		let ordersEndpoint = `${getStoreApiURL(store)}/orders.json?created_at_min=${start}&created_at_max=${endIncremented}&financial_status=paid&status=any&limit=250`;

		const fetchOrders = () => {
			console.count("fetching...")
			axios.get(ordersEndpoint, {
				headers: {
					'X-Shopify-Access-Token': decrypt(shopifyAccessToken)
				}
			})
				.then(response => {
					//alguns pedidos podem ter sidos cancelados depois de pagos
					const trueOrders = response.data.orders.filter(order => order.cancelled_at === null);
					allOrders = allOrders.concat(trueOrders);
					ordersEndpoint = extractHttpsUrl(response.headers.link);
					if (ordersEndpoint) {
						fetchOrders(); // Call the function recursively to continue fetching orders
					} else {
						res.status(200).json({
							id: 'shopify.order-metrics',
							metricsBreakdown: getMetrics(allOrders, granularity)
						});
					}
				})
				.catch(error => {
					console.log(error.data);
				});
		}

		fetchOrders();
	}
});

module.exports = router;
