const router = require('express').Router();
const axios = require('axios');
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../utils/crypto');
const logger = require('../utils/logger');
const { getStoreApiURL, getMetrics, extractHttpsUrl } = require('../utils/shop');
const { checkAuth } = require('../utils/user');

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
router.post('/shopify/connect', checkAuth, (req, res) => {
	const { store, access_token } = req.body;

	if (!(store && access_token)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
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
					logger.error(err);
					return res.status(500).json({ success: false, message: 'Internal server error' });
				} else {
					res.status(201).json({ success: true, message: 'Store connected to account' });
				}
			})
		});
});

router.get('/shopify/callback', checkAuth, (req, res, next) => {
	const { code, hmac, state, shop } = req.query;

	//TODO: hmac, state, shop-regex security checks
	if (state === localState) {
		axios.post(`https://${shop}/admin/oauth/access_token?client_id=${SHOPIFY_CLIENT_ID}&client_secret=${SHOPIFY_CLIENT_SECRET}&code=${code}`)
			.then(res => User.findOne({ _id: req.user._id })
				.then(user => {
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
						if (err) logger.error(err);
					})
				})
			)
			.catch(err => logger.error(err));

		res.redirect(process.env.FRONTEND_URL);
	} else {
		res.status(401).send('Security check failed, check state, hmac, or shop parameter');
	}
});

//currently only returns paid orders
//parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
//triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
router.post('/shopify/orders', (req, res) => {
	const { store, start, end, granularity } = req.body;
	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const shopifyAccessToken = getToken(req, 'shopify');
	if (!shopifyAccessToken) {
		return res.status(403).json({ success: false, message: 'User cannot perform queries on behalf of this store' });
	}

	//frontend must set start and end to the same date for a single day of data, granularity must be 'hour'!
	let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;
	let allOrders = [];
	let ordersEndpoint = `${getStoreApiURL(store)}/orders.json`;

	const fetchOrders = () => {
		axios.get(ordersEndpoint, {
			params: {
				created_at_min: start,
				created_at_max: endIncremented,
				financial_status: 'paid',
				status: 'any',
				limit: 250
			},
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
				logger.error(error.data);
				res.status(500).json({ sucess: false, message: 'Internal server error' });
			});
	}

	fetchOrders();
});

router.post('/shopify/abandoned-checkouts', checkAuth, (req, res) => {
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
				res.status(200).json(response.data);
				// res.status(200).json({
				// 	id: 'shopify.abandoned-checkout-metrics',
				// 	metricsBreakdown: getMetrics(response.data.checkouts, granularity)
				// });
			})
			.catch(error => logger.error(error));
	}
});

module.exports = router;
