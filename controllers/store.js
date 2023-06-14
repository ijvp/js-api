const { logger } = require('../utils/logger');

class StoreController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async getStoresByUserId(userId) {
		try {
			const storeIds = await this.redisClient.smembers(`user_stores:${userId}`);
			return storeIds;
			// const stores = [];

			// for (const storeId of storeIds) {
			// 	const store = await this.redisClient.hgetall(`stores:${storeId}`);
			// 	if (store) {
			// 		stores.push(store);
			// 	}
			// }

			// return stores;
		} catch (error) {
			logger.error('Error retrieving stores by user ID: %s', error);
			throw error;
		}
	}

	async getStoreConnections(storeId) {
		try {
			const connections = {
				facebook_account: false,
				google_account: false,
			};

			const [facebookAccountExists, googleAccountExists] = await Promise.all([
				this.redisClient.exists(`facebook_account:${storeId}`),
				this.redisClient.exists(`google_account:${storeId}`),
			]);

			if (facebookAccountExists) {
				connections.facebook_account = true;
			}

			if (googleAccountExists) {
				connections.google_account = true;
			}

			return connections;
		} catch (error) {
			logger.error('Error retrieving store connections by store ID: %s', error);
			throw error;
		}
	};
};

module.exports = StoreController;
