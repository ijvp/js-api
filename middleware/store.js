const logger = require('../utils/logger');
const { redisClient } = require('../om/redisClient');

const storeExists = async (req, res, next) => {
	const store = req.method === 'POST' ? req.body.store : req.query.store;

	redisClient.sismember(`user_stores:${req.session.userId}`, store)
		.then(result => {
			if (!result) {
				return next(new Error('Store not found'))
			};

			next();
		})
		.catch(err => {
			logger.error(`Error checking store existence: ${err}`);
			return next(new Error('Internal Server Error'))
		})
};

module.exports = { storeExists };