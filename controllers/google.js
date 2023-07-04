const { GoogleAdsApi } = require('google-ads-api');
const { google } = require('googleapis');
const logger = require('../utils/logger');

const googleAds = new GoogleAdsApi({
	client_id: `${process.env.GOOGLE_CLIENT_ID}`,
	client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
	developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
});

const googleAnalytics = google.analyticsreporting('v4');

class GoogleController {
	constructor(redisClient) {
		this.redisClient = redisClient;
		this.googleAds = googleAds;
		this.googleAnalytics = googleAnalytics;
	}

	async grantGoogleAdsAccessToStore(storeId, tokens) {
		try {
			await this.redisClient.hmset(`store:${storeId}`, {
				googleAdsAccessToken: tokens.access_token,
				googleAdsRefreshToken: tokens.refresh_token,
				googleAdsExpiryDate: tokens.expiry_date
			});
			logger.info(`Granted store '${storeId}' access to Google Ads API`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async grantGoogleAnalyticsAccessToStore(storeId, tokens) {
		console.log("GOOGLE ANALYTICS TOKENS", tokens);
		try {
			await this.redisClient.hmset(`store:${storeId}`, {
				googleAnalyticsAccessToken: tokens.access_token,
				googleAnalyticsRefreshToken: tokens.refresh_token,
				googleAnalyticsExpiryDate: tokens.expiry_date
			});
			logger.info(`Granted store '${storeId}' access to Google Analytics API`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async revokeGoogleAdsAccessFromStore(storeId) {
		try {
			await this.redisClient.hdel(`store:${storeId}`, 'googleAdsAccessToken', 'googleAdsRefreshToken');
			logger.info(`Revoked store '${storeId}' access to Google Ads APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchGoogleAdsAccountList(storeId) {
		try {
			const token = await this.redisClient.hget(`store:${storeId}`, 'googleAdsRefreshToken');
			const { resource_names } = await this.googleAds.listAccessibleCustomers(token);
			let accounts = await Promise.all(resource_names.map(async resourceName => {
				const customerId = resourceName.split('customers/')[1];
				const customer = this.googleAds.Customer({
					customer_id: customerId,
					refresh_token: token
				});

				try {
					const response = await customer.report({
						entity: 'customer_client',
						attributes: ['customer_client.id', 'customer_client.resource_name', 'customer_client.descriptive_name']
					});

					// when returning manager account, it will have several entries with different customer_clients
					// we want the manager account itself, otherwise descriptive_name is null;
					const { customer_client } = response.find(account => account.customer_client.id.toString() === customerId);
					return customer_client;
				} catch (error) {
					logger.error(error.message);
					return;
				}
			}));

			accounts = accounts.filter(account => !!account);
			accounts = accounts.filter(account => account.descriptive_name);
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

	async fetchGoogleAnalyticsAccountList(storeId) {
		try {
			const tokens = await this.redisClient.hmget(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
			const authClient = new google.auth.OAuth2(`${process.env.GOOGLE_CLIENT_ID}`, `${process.env.GOOGLE_CLIENT_SECRET}`);
			authClient.setCredentials({ access_token: tokens[0], refresh_token: tokens[1] });

			const analytics = google.analyticsadmin('v1alpha');
			let accounts = [];
			let nextPage = "";
			do {
				const accountSummaries = await analytics.accountSummaries.list({ auth: authClient, pageSize: 200, pageToken: nextPage });
				accounts.push(accountSummaries.data.accountSummaries);
				nextPage = accountSummaries.data.nextPageToken;
			} while (nextPage);

			return accounts;
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

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
			logger.info(`Google Ads account hash '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async deleteGoogleAdsAcccount(storeId) {
		try {
			await this.redisClient.del(`google_ads_account:${storeId}`);
			logger.info(`Google Ads account hash '${storeId}' deleted`);
			await this.revokeGoogleAccessFromStore(storeId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = GoogleController;