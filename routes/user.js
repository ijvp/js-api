const { redisClient } = require('../om/redisClient');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = require('express').Router();

router.get('/user/stores', auth, async (req, res) => {
	try {
		const userId = req.session.userId;
		const userStores = await redisClient.smembers(`user_stores:${userId}`);
		return res.json({ stores: userStores })
	} catch (error) {
		logger.error(`Failed to fetch user stores: ${error}`);
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
});

module.exports = router;