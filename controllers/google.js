const { GoogleAdsApi } = require('google-ads-api');
const logger = require('../utils/logger');

const client = new GoogleAdsApi({
	client_id: `${process.env.GOOGLE_CLIENT_ID}`,
	client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
	developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
});

class GoogleController {
	constructor(redisClient) {
		this.redisClient = redisClient;
		this.googleClient = client;
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
			logger.info(`Google Ads account for '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async grantGoogleAccessToStore(storeId, tokens) {
		try {
			await this.redisClient.hmset(`store:${storeId}`, {
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

	async fetchGoogleAdsAccountList(storeId) {
		try {
			const token = await this.redisClient.hget(`store:${storeId}`, 'googleRefreshToken');
			const { resource_names } = await this.googleClient.listAccessibleCustomers(token);
			const accounts = await Promise.all(resource_names.map(async resourceName => {
				const customerId = resourceName.split('customers/')[1];
				const customer = this.googleClient.Customer({
					customer_id: customerId,
					refresh_token: token
				});

				const response = await customer.report({
					entity: 'customer_client',
					attributes: ['customer_client.id', 'customer_client.resource_name', 'customer_client.descriptive_name']
				});

				// when returning manager account, it will have several entries with different customer_clients
				// we want the manager account itself, otherwise descriptive_name is null;
				const { customer_client } = response.find(account => account.customer_client.id.toString() === customerId);
				return customer_client;
			}));

			accounts.sort((a, b) => {
				const nameA = a.descriptive_name.toUpperCase();
				const nameB = b.descriptive_name.toUpperCase();

				if (nameA < nameB) {
					return -1;
				} else if (nameA > nameB) {
					return 1;
				} else {
					return 0;
				}
			});

			return accounts;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = GoogleController;