const { redisClient } = require('../om/redisClient');
const { auth } = require('../middleware/auth');
const router = require('express').Router();
const StoreController = require('../controllers/store');

const storeController = new StoreController(redisClient);

router.get('/user/stores', auth, async (req, res) => {
	try {
		const stores = await storeController.getStoresByUserId(req.session.userId);
		return res.json(stores);
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