const router = require('express').Router();
const logger = require('../utils/logger');
const { getMetrics, getSessionFromStorage } = require('../utils/shop');
const { checkAuth, checkStoreExistence } = require('../utils/middleware');
const { auth } = require('../middleware/auth');
const shopify = require('../om/shopifyClient');
const { redisClient } = require('../om/redisClient');
const StoreController = require('../controllers/store');

const storeController = new StoreController(redisClient);

router.get('/shopify/authorize', auth, (req, res) => {
	const redirectUri = `${process.env.BACKEND_URL}${shopify.config.auth.callbackPath}`;
	const authorizationUrl = 'https://accounts.shopify.com/store-login?redirect=' + encodeURIComponent(`/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&redirect_uri=${redirectUri}&scope=${process.env.SHOPIFY_SCOPES}`);
	return res.status(200).json(authorizationUrl);
});

router.get(shopify.config.auth.path, shopify.auth.begin());

router.get(shopify.config.auth.callbackPath, async (req, res) => {
	try {
		const { code, hmac, shop, state } = req.query;
		const { access_token, scope } = await storeController.getShopAccessToken(shop, code);

		const store = {
			name: shop,
			shopifyAccessToken: access_token,
			scope
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
		res.redirect(`${process.env.FRONTEND_URL}?shopify-install-error=true`);
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
		const orders = await storeController.fetchStoreOrders({ storeId: store, start, end });
		return res.json(getMetrics(orders, granularity));
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Internal Server Error' });
	};
});

router.post('/shopify/abandoned-checkouts', auth, checkStoreExistence, async (req, res) => {
	const { store, start, end, granularity } = req.body;

	if (!(store && start && granularity)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	try {
		const abandonedCheckouts = await storeController.fetchStoreAbandonedCheckouts({ storeId: store, start, end });
		return res.json(getMetrics(abandonedCheckouts, granularity));
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Internal Server Error' });
	}
});

router.post('/shopify/most-wanted', auth, async (req, res) => {
	const { store } = req.body;
	if (!store) {
		return res.status(400).json({ success: false, message: 'Invalid request body' })
	};

	try {
		const products = await storeController.fetchBestSellingProducts(store);
		res.json(products);
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Internal Server Error' });
	};
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
