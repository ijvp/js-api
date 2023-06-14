const shopify = require("../om/shopifyClient");
const logger = require('../utils/logger');

const arrayToObject = (arr) => {
	const result = {};
	for (const [key, value] of arr) {
		result[key] = value;
	}

	return result;
};

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
		};
	};

	async getStoreConnections(storeId) {
		try {
			const connections = {
				facebook_ads: false,
				google_ads: false,
			};

			const [facebookAccountExists, googleAccountExists] = await Promise.all([
				this.redisClient.exists(`facebook_ads_account:${storeId}`),
				this.redisClient.exists(`google_ads_account:${storeId}`),
			]);

			if (facebookAccountExists) {
				connections.facebook_ads = true;
			}

			if (googleAccountExists) {
				connections.google_ads = true;
			}

			return connections;
		} catch (error) {
			logger.error('Error retrieving store connections: %s', error);
			throw error;
		}
	};

	async createStore(store) {
		try {
			await this.redisClient.hset(`store:${store.name}`, store);
			logger.info(`Store '${store.name}' hash persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async associateStoreWithUser(storeId, userId) {
		try {
			await this.redisClient.sadd(`user_stores:${userId}`, storeId);
			logger.info(`Store '${storeId}' associated with user '${userId}'`);
		} catch (error) {
			logger.error(error);
			throw error;
		};
	};

	async getStoreShopifySession(storeId) {
		try {
			const session = await this.redisClient.get(`${shopify.config.sessionStorage.options.sessionKeyPrefix}_offline_${storeId}`);
			return arrayToObject(JSON.parse(session));
		} catch (error) {
			logger.error(error);
			throw error;
		};
	};
};

module.exports = StoreController;
