const axios = require('axios');
const logger = require('../utils/logger');

class FacebookController {
	constructor(redisClient) {
		this.redisClient = redisClient;
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

	async fetchFacebookAccountList(storeId) {
		try {
			const token = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');

			let allAccounts = [];
			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me/adaccounts?fields=name%2Cid%2Caccount_id&access_token=${token}`;

			while (url) {
				const { data: accounts } = await axios.get(url);
				allAccounts = allAccounts.concat(accounts.data);
				url = accounts.paging.next;
			}

			allAccounts.sort((a, b) => {
				const nameA = a.name.toUpperCase();
				const nameB = b.name.toUpperCase();

				if (nameA < nameB) {
					return -1;
				} else if (nameA > nameB) {
					return 1;
				} else {
					return 0;
				}
			});

			return allAccounts;
		} catch (error) {
			logger.error(error);
			throw error;
		}
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
			logger.info(`Facebook Ads account hash '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async deleteFacebookAdsAccount(storeId) {
		try {
			await this.redisClient.del(`facebook_ads_account:${storeId}`);
			logger.info(`Facebook Ads account hash '${storeId}' deleted`);
			await this.revokeFacebookAccessFromStore(storeId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = FacebookController;
