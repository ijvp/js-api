const logger = require('../utils/logger');

class FacebookController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async getFacebookAccountByStoreId(storeId) {
		try {
			const facebookAdsAccount = await this.redisClient.hgetall(
				`facebook_ads_account:${storeId}`
			);
			return facebookAdsAccount;
		} catch (error) {
			logger.error('Error retrieving Facebook Ads Account: %s', error);
			throw error;
		};
	};

	async createFacebookAdsAccount(account) {
		try {
			await this.redisClient.hset(`facebook_ads_account:${account.storeId}`, account);
			logger.info(`Facebook Ads account for '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async grantFacebookAccessToStore(storeId, token) {
		try {
			await this.redisClient.hset(`store:${storeId}`, {
				facebookAccessToken: token,
			});
			logger.info(`Granted store '${storeId}' access to Facebook APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async revokeFacebookAccessFromStore(storeId) {
		try {
			await this.redisClient.hdel(`store:${storeId}`, 'facebookAccessToken');
			logger.info(`Revoked store '${storeId}' access to Facebook APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = FacebookController;
