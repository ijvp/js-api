const router = require('express').Router();
const axios = require('axios');
const logger = require('../utils/logger');
const { getStoreApiURL, getStoreFrontApiURL, getMetrics, extractHttpsUrl, getSessionFromStorage } = require('../utils/shop');
const { checkAuth, checkStoreExistence } = require('../utils/middleware');
const { auth } = require('../middleware/auth');
const shopify = require('../om/shopifyClient');
const { redisClient } = require('../om/redisClient');
const StoreController = require('../controllers/store');

const storeController = new StoreController(redisClient);

router.get('/shopify/authorize', auth, (req, res) => {
	const redirectUri = `${process.env.BACKEND_URL}${shopify.config.auth.callbackPath}`;
	console.log(redirectUri)
	const authorizationUrl = 'https://accounts.shopify.com/store-login?redirect=' + encodeURIComponent(`/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&redirect_uri=${redirectUri}&scope=${process.env.SHOPIFY_SCOPES}`);

	return res.status(200).json(authorizationUrl);
});

router.get(shopify.config.auth.path, shopify.auth.begin());
/*, shopify.auth.callback()*/
router.get(shopify.config.auth.callbackPath, async (req, res) => {
	try {
		const { shop } = res.locals.shopify.session;
		const store = {
			name: shop
		};

		await storeController.createStore(store);

		// TODO: shopify oAuth flow when user installs app 
		// before registering TurboDash account.
		// How to keep storeRef and associate user at a
		// later point?
		if (req.session.userId) {
			await storeController.associateStoreWithUser(store.name, req.session.userId);
		};

		return res.redirect(process.env.FRONTEND_URL);
	} catch (error) {
		logger.error(error);
		res.redirect(shopify.config.auth.path);
	}
});

//currently only returns paid orders
//parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
//triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
router.post('/shopify/orders', auth, checkStoreExistence, async (req, res) => {
	const { store, start, end, granularity } = req.body;

	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	try {
		//frontend must set start and end to the same date for a single day of data, granularity must be 'hour'!
		const storeSession = await storeController.getStoreShopifySession(store);
		const orders = await shopify.api.rest.Order.all({
			session: storeSession,
			created_at_min: start,
			created_at_max: end
		});

		return res.json(getMetrics(orders.data, granularity));
	} catch (error) {
		return res.status(500).json({ success: false, error: JSON.stringify(error) });
	}

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

});

router.get('/shopify/test', (req, res) => {
	logger.info(req.session);
	res.json(req.session);
})
module.exports = router;
