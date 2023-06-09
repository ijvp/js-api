export const storeExists = (req, res, next) => {
	const store = req.method === 'POST' ? req.body.store : req.query.store;
	const userId = req.session.userId;

	redisClient.sIsMember(`user_stores:${userId}`, store)
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
}