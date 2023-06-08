const { redisClient } = require('../om/redisClient');
const { checkAuth } = require('../utils/middleware');

const router = require('express').Router();

router.get('/user/stores', checkAuth, async (req, res) => {
	try {
		logger.info("called, fetching user stores from redis")
		const userId = req.user._id;
		const userStores = await redisClient.sMembers(`user_stores:${userId}`);
		return res.json({ stores: userStores })
	} catch (error) {
		logger.error(`Failed to fetch user stores: ${error}`);
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
});

module.exports = router;