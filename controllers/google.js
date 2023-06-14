const { logger } = require('../utils/logger');

class GoogleController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	}

	async getGoogleAdsAccountByStoreId(storeId) {
		try {
			const googleAdsAccount = await this.redisClient.hgetall(
				`google_ads_account:${storeId}`
			);
			return googleAdsAccount;
		} catch (error) {
			logger.error('Error retrieving Google Ads Account: %s', error);
			throw error;
		};
	};

	async createGoogleAdsAccount(account) {
		try {
			await this.redisClient.hset(`google_ads_account:${account.storeId}`, account);
			logger.info(`Google Ads account for '${store.name}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async grantGoogleAccessToStore(storeId, tokens) {
		try {
			await this.redisClient.hset(`store:${storeId}`, {
				googleAccessToken: tokens.access_token,
				googleRefreshToken: tokens.refresh_token
			});
			logger.info(`Granted store '${storeId}' access to Google APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async revokeGoogleAccessFromStore(storeId) {
		try {
			await this.redisClient.hdel(`store:${storeId}`, 'googleAccessToken', 'googleRefreshToken');
			logger.info(`Revoked store '${storeId}' access to Google APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = GoogleController;