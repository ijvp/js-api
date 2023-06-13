const { redisClient } = require("../om/redisClient");
const logger = require('../utils/logger');

const checkAuth = (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: 'Not logged in' });
	}

	next();
};

const checkStoreExistence = (req, res, next) => {
	const userId = req.session.userId;
	const store = req.method === 'POST' ? req.body.store : req.query.store;

	redisClient.sismember(`user_stores:${userId}`, store)
		.then(result => {
			if (!result) {
				return res.status(404).json({ success: false, error: "Store not found" })
			};

			next();
		})
		.catch(err => {
			logger.error(`Error checking store existence: ${err}`);
			return res.status(500).json({ error: "Internal Server Error" })
		})
};

module.exports = { checkAuth, checkStoreExistence };