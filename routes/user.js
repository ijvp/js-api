const { redis } = require('../clients');
const { auth } = require('../middleware/auth');
const { storeExists } = require('../middleware/store')
const router = require('express').Router();
const StoreController = require('../controllers/store');

const { redisClient } = redis;
const storeController = new StoreController(redisClient);

router.get('/user/stores', auth, async (req, res) => {
	try {
		const stores = [];
		const storeIds = await storeController.getStoresByUserId(req.session.userId);
		const storesPromises = storeIds.map(async storeId => {
			const store = await redisClient.hgetall(`store:${storeId}`);
			return store;
		});

		stores.push(... await Promise.all(storesPromises));
		return res.json(stores);
	} catch (error) {
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
});

router.delete('/user/store', auth, storeExists, async (req, res) => {
	try {
		const { store } = req.query;
		const { userId } = req.session;
		await storeController.deleteStoreData(store, userId);
		res.json({
			success: true, message: `Store '${store}' data deleted successfully }`
		})
	} catch (error) {
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
});

router.get('/user/store/connections', auth, async (req, res) => {
	const { store } = req.query;

	if (!store) {
		return res.status(400).json({ success: false, error: "Missing store parameter" });
	};

	try {
		const connections = await storeController.getStoreConnections(store);
		return res.json(connections);
	} catch (error) {
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
})

module.exports = router;