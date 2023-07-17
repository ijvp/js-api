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

	// Google Ads
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

	async getGoogleAdsAccountByStoreId(storeId) {
		try {
			const googleAdsAccount = await this.redisClient.hgetall(
				`google_ads_account:${storeId}`
			);
			return googleAdsAccount;
		} catch (error) {
			logger.error('Error retrieving Google Ads account: %s', error);
			throw error;
		};
	};

	async storeGoogleAdsAccount(account) {
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
			const numKeys = await this.redisClient.del(`google_ads_account:${storeId}`);
			if (numKeys) {
				logger.info(`Google Ads account hash '${storeId}' deleted`);
				await this.revokeGoogleAdsAccessFromStore(storeId);
			} else {
				logger.info(`No Google Ads account hash '${storeId}' founf`);
			}
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	// Google Analytics
	async grantGoogleAnalyticsAccessToStore(storeId, tokens) {
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

	async revokeGoogleAnalyticsAccessFromStore(storeId) {
		try {
			await this.redisClient.hdel(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
			logger.info(`Revoked store '${storeId}' access to Google Analytics APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchGoogleAnalyticsPropertiesList(storeId) {
		try {
			const tokens = await this.redisClient.hmget(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
			const authClient = new google.auth.OAuth2(`${process.env.GOOGLE_CLIENT_ID}`, `${process.env.GOOGLE_CLIENT_SECRET}`);
			authClient.setCredentials({ access_token: tokens[0], refresh_token: tokens[1] });

			const analytics = google.analyticsadmin('v1alpha');
			let accounts = [];
			let nextPage = "";
			do {
				const { data } = await analytics.accountSummaries.list({ auth: authClient, pageSize: 200, pageToken: nextPage });
				const propertySummaries = data.accountSummaries.flatMap(accountSummary => {
					return accountSummary.propertySummaries?.map(propertySummary => {
						return { id: propertySummary.property.split("/")[1], name: propertySummary.displayName }
					})
				}).filter(item => !!item);

				accounts.push(...propertySummaries);
				nextPage = data.nextPageToken;
			} while (nextPage);

			return accounts;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async getGoogleAnalyticsPropertyByStoreId(storeId) {
		try {
			const googleAnalyticsAccount = await this.redisClient.hgetall(
				`google_analytics_property:${storeId}`
			);
			return googleAnalyticsAccount;
		} catch (error) {
			logger.error('Error retrieving Google Analytics account: %s', error);
			throw error;
		}
	};

	async storeGoogleAnalyticsProperty(account) {
		try {
			await this.redisClient.hset(`google_analytics_property:${account.storeId}`, account);
			logger.info(`Google Analytics account hash '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async deleteGoogleAnalyticsProperty(storeId) {
		try {
			const numKeys = await this.redisClient.del(`google_analytics_property:${storeId}`);
			console.log(numKeys);
			if (numKeys) {
				logger.info(`Google Analytics property hash '${storeId}' deleted`);
				await this.revokeGoogleAnalyticsAccessFromStore(storeId);
			} else {
				logger.info(`No Google Analytics property hash '${storeId}' found`);
			}
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchProductPageSessions(storeId, dateRange) {
		try {
			// 1.)	get analytics tokens
			// 2.)	get google_analytics_account hash -> ga4 propertyId
			// 3.)	call analytics library runReport function with propertyId
			//			and pass authClient
			// 4.)	transform googleResponse into turboDashResponse
			const tokens = await this.redisClient.hmget(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
			const authClient = new google.auth.OAuth2(`${process.env.GOOGLE_CLIENT_ID}`, `${process.env.GOOGLE_CLIENT_SECRET}`);
			authClient.setCredentials({ access_token: tokens[0], refresh_token: tokens[1] });

			const analytics = google.analyticsdata('v1beta')
			const { id } = await this.getGoogleAnalyticsPropertyByStoreId(storeId);
			// query built using https://ga-dev-tools.google/ga4/query-explorer/

			const { data: report } = await analytics.properties.runReport({
				auth: authClient,
				property: `properties/${id}`,
				requestBody: {
					dimensions: [
						{
							name: 'pagePath'
						}
					],
					dimensionFilter: {
						filter: {
							fieldName: 'pagePath',
							stringFilter: {
								matchType: "CONTAINS",
								value: "products"
							}
						}
					},
					metrics: [
						{
							name: "sessions"
						}
					],
					dateRanges: [
						dateRange,
					],
				}
			});
			return report;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = GoogleController;
