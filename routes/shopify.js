const router = require('express').Router();
const axios = require('axios');
const logger = require('../utils/logger');
const { getStoreApiURL, getStoreFrontApiURL, getMetrics, extractHttpsUrl, getSessionFromStorage } = require('../utils/shop');
const { checkAuth, checkStoreExistence } = require('../utils/middleware');
const { auth } = require('../middleware/auth');
const shopify = require('../om/shopifyClient');
const { redisClient } = require('../om/redisClient');

router.get('/shopify/authorize', auth, (req, res) => {
	const redirectUri = `${process.env.BACKEND_URL}${shopify.config.auth.callbackPath}`;
	console.log(redirectUri)
	const authorizationUrl = 'https://accounts.shopify.com/store-login?redirect=' + encodeURIComponent(`/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&redirect_uri=${redirectUri}&scope=${process.env.SHOPIFY_SCOPES}`);

	return res.status(200).json(authorizationUrl);
});

router.get(shopify.config.auth.path, shopify.auth.begin());

router.get(shopify.config.auth.callbackPath, shopify.auth.callback(), (req, res) => {
	try {
		const { shop } = res.locals.shopify.session;
		const storeData = {
			name: shop
		};

		redisClient.hSet(`store: ${shop}`, storeData)
			.then(() => {
				logger.info(`Store object '${shop}' persisted`);
			})
			.catch(error => {
				logger.error(error);
				return res.status(500).json({ success: false, error: 'Internal Server Error' });
			});

		//user is logged in, save authorized store to current user
		if (req.user) {
			const userId = req.user._id;

			redisClient.sAdd(`user_stores: ${userId}`, shop)
				.then(() => {
					logger.info(`Store '${shop}' added to user_stores set for user with ID '${userId}'`);
				})
				.catch(error => {
					logger.error(error);
					return res.status(500).json({ success: false, error: 'Internal Server Error' });
				});
		}

		return res.redirect('/shopify/session');
	} catch (error) {
		logger.error(error);
		res.redirect(shopify.config.auth.path);
	}

});

router.get('/shopify/session', async (req, res) => {
	const sessionId = await shopify.api.session.getCurrentId({
		isOnline: true,
		rawRequest: req,
		rawResponse: res
	});

	res.json({ shopify, sessionId });
});

//currently only returns paid orders
//parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
//triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
router.post('/shopify/orders', checkAuth, checkStoreExistence, async (req, res) => {
	const { store, start, end, granularity } = req.body;

	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	try {
		// const shopifyAccessToken = getToken(req, 'shopify');
		// const token = decrypt(shopifyAccessToken);
		// if (!token) {
		// 	return res.status(403).json({ success: false, message: 'User cannot perform this type of query on behalf of this store' });
		// }
		//frontend must set start and end to the same date for a single day of data, granularity must be 'hour'!
		const storeSession = await getSessionFromStorage(store);

		const orders = await shopify.api.rest.Order.all({
			session: storeSession,
			created_at_min: start,
			created_at_max: end
		});

		return res.json(getMetrics(orders.data, granularity));
	} catch (error) {
		return res.status(500).json({ success: false, message: JSON.stringify(error) });
	}

	let allOrders = [];
	let ordersEndpoint = `${getStoreApiURL(store)} / orders.json`;
	let params = {
		created_at_min: new Date(start),
		created_at_max: new Date(end),
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
					return res.status(200).json({
						id: 'shopify.order-metrics',
						metricsBreakdown: getMetrics(allOrders, granularity)
					});
				}
			})
			.catch(error => {
				logger.error(error);
				return res.status(500).json({ sucess: false, message: 'Internal server error' });
			});
	};

	fetchOrders();
});

router.post('/shopify/abandoned-checkouts', checkAuth, checkStoreExistence, async (req, res) => {
	const { store, start, end, granularity } = req.body;

	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const storeSession = await getSessionFromStorage(store);
	const token = storeSession.accessToken;

	const abandonedCheckouts = await shopify.api.rest.AbandonedCheckout.checkouts({
		session: storeSession,
		created_at_min: start,
		created_at_max: end
	});

	return res.json(abandonedCheckouts);

	let endIncremented = end ? new Date(new Date(end).setDate(new Date(end).getDate() + 1)) : undefined;
	let allAbandonedCheckouts = [];
	let abandonedCheckoutEndpoint = `${getStoreApiURL(store)} / checkouts.json`;
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

router.post('/shopify/most-wanted', checkAuth, async (req, res) => {
	const { store } = req.body;
	if (!store) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	const storeSession = await getSessionFromStorage(store);
	const token = storeSession.accessToken;

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
		url: `${getStoreFrontApiURL(store)} / graphql.json`,
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
			'X-Shopify-Storefront-Access-Token': token
		},
		data: JSON.stringify({
			query: query
		})
	}).then((response) => {
		if (response.data.errors) {
			return res.status(500).send({ success: false, message: response.data.errors })
		} else {
			return res.status(200).send(response.data.data.products.edges)
		}
	}).catch((error) => {
		logger.error(error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	})
});

router.post('/shopify/product', checkAuth, async (req, res) => {
	const { store, productId } = req.body;
	if (!productId) {
		return res.status(400).json({ success: false, message: 'Invalid request body, missing product id' })
	};

	try {
		const storeSession = await getSessionFromStorage(store);

		const product = await shopify.api.rest.Product.find({
			session: storeSession,
			id: productId
		});

		return res.json(product);
	} catch (error) {
		return res.status(500).json({ success: false, message: JSON.stringify(error) });
	}

	const query = `
  query getProduct($productId: ID!) {
					product(id: $productId) {
						id
						title
						description
      featuredImage {
							altText
							url
							width
							height
						}
			priceRange {
				maxVariantPrice {
								amount
							}
				minVariantPrice {
								amount
							}
						}
						onlineStoreUrl
					}
				}
					`;

	axios({
		url: `${getStoreFrontApiURL(store)} / graphql.json`,
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
			'X-Shopify-Storefront-Access-Token': token
		},
		data: JSON.stringify({
			query: query,
			variables: { productId: productId }
		})
	}).then((response) => {
		if (response.data.errors) {
			return res.status(500).send({ success: false, message: response.data.errors })
		} else {
			return res.status(200).send(response.data.data.product)
		}
	}).catch((error) => {
		logger.error(error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	})
});

router.get('/shopify/test', (req, res) => {
	logger.info(req.session);
	res.json(req.session);
})
module.exports = router;
