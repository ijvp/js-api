const router = require('express').Router();
const axios = require('axios');
const { User } = require('../models/User');
const { encrypt, decrypt, getToken } = require('../utils/crypto');
const logger = require('../utils/logger');
const { getStoreApiURL, getStoreFrontApiURL, getMetrics, extractHttpsUrl } = require('../utils/shop');
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
	const { store, access_token, storefront_token } = req.body;

	if (!(store && access_token)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	}

	User.findById(req.user._id)
		.then(user => {
			if (!user.shops) user.shops = [];

			const storeExists = user.shops.find((shop) => shop.name === store);
			const encryptedToken = encrypt(access_token);
			const encryptedStoreToken = encrypt(storefront_token);

			if(!storeExists) {
				user.shops.push({
					name: store,
					shopify_access_token: encryptedToken,
					shopify_storefront_token: encryptedStoreToken
				});
			} else {
				return res.status(409).json({ success: false, message: 'Shop already exists' });
			}
			
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
					//const encryptedStoreToken = encrypt(res.data.store_token)
					if (shopIndex >= 0) {
						user.shops[shopIndex].shopify_access_token = encryptedToken;
						//user.shops[shopIndex].shopify_store_token = encryptedStoreToken
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
		logger.warn("Security check failed for callback!")
		res.status(401).send('Security check failed, check state, hmac, or shop parameter');
	}
});

//currently only returns paid orders
//parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
//triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
router.post('/shopify/orders', checkAuth, (req, res) => {
	const { store, start, end, granularity } = req.body;
	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const shopifyAccessToken = getToken(req, 'shopify');
	const token = decrypt(shopifyAccessToken);
	if (!token) {
		return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
	}

	//frontend must set start and end to the same date for a single day of data, granularity must be 'hour'!
	let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;
	let allOrders = [];
	let ordersEndpoint = `${getStoreApiURL(store)}/orders.json`;
	let params = {
		created_at_min: start,
		created_at_max: endIncremented,
		financial_status: 'paid',
		status: 'any',
		limit: 250
	};

	const fetchOrders = () => {
		axios.get(ordersEndpoint, {
			params,
			headers: {
				'X-Shopify-Access-Token': token
			}
		})
			.then(response => {
				//alguns pedidos podem ter sidos cancelados depois de pagos
				const trueOrders = response.data.orders.filter(order => order.cancelled_at === null);
				allOrders = allOrders.concat(trueOrders);
				ordersEndpoint = extractHttpsUrl(response.headers.link);
				if (ordersEndpoint) {
					params = undefined; //must clear original query parameters otherwise new endpoint will return 400
					fetchOrders(); // Call the function recursively to continue fetching orders
				} else {
					res.status(200).json({
						id: 'shopify.order-metrics',
						metricsBreakdown: getMetrics(allOrders, granularity)
					});
				}
			})
			.catch(error => {
				logger.error(error);
				res.status(500).json({ sucess: false, message: 'Internal server error' });
			});
	};

	fetchOrders();
});

router.post('/shopify/abandoned-checkouts', checkAuth, (req, res) => {
	const { store, start, end, granularity } = req.body;

	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const shopifyAccessToken = getToken(req, 'shopify');
	const token = decrypt(shopifyAccessToken);
	if (!token) {
		return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
	}

	let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;
	let allAbandonedCheckouts = [];
	let abandonedCheckoutEndpoint = `${getStoreApiURL(store)}/checkouts.json`;
	let params = {
		created_at_min: start,
		created_at_max: endIncremented,
		limit: 250
	}

	const fetchAbandonedCheckouts = () => {
		axios.get(abandonedCheckoutEndpoint, {
			params: params,
			headers: {
				'X-Shopify-Access-Token': token
			}
		})
			.then(response => {
				const { checkouts } = response.data;
				allAbandonedCheckouts = allAbandonedCheckouts.concat(checkouts);
				abandonedCheckoutEndpoint = extractHttpsUrl(response.headers.link);
				if (abandonedCheckoutEndpoint) {
					params = undefined;
					fetchAbandonedCheckouts();
				} else {
					res.status(200).json({
						id: 'shopify.abandoned-checkout-metrics',
						metricsBreakdown: getMetrics(allAbandonedCheckouts, granularity)
					});
				}
			})
			.catch(error => {
				logger.error(error);
				res.status(500).json({ success: false, message: 'Internal server error' });
			});
	};

	fetchAbandonedCheckouts();
});

router.get('/shopify/most-wanted', checkAuth, (req, res) => {
	const { store } = req.body;
	if (!store) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const shopifyStoreToken = getToken(req, 'shopify', 'storefront');
	const token = decrypt(shopifyStoreToken);

	const query = `
		{
			products(first: 10, sortKey: BEST_SELLING) {
				edges {
					node {
						id
						title
					}
				}
			}
		}
		`;

	axios({
		url: `${getStoreFrontApiURL(store)}/graphql.json`,
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
			'X-Shopify-Storefront-Access-Token': token
		},
		data: JSON.stringify({
			query: query
		})
	}).then((response) => {
		if(response.data.errors) {
			return res.status(500).send({ success: false, message: response.data.errors })
		} else {
			return res.status(200).send(response.data.data.products.edges)
		}
	}).catch((error) => {
		logger.error(error);
      		return res.status(500).json({ success: false, message: 'Internal server error' });
	})
})

module.exports = router;
