const logger = require('../utils/logger');
const { getStoreApiURL, extractHttpsUrl } = require('../utils/shop');
const axios = require('axios');
const GoogleController = require('./google');
const FacebookController = require('./facebook');

class StoreController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async getStoresByUserId(userId) {
		try {
			const storeIds = await this.redisClient.smembers(`user_stores:${userId}`);
			return storeIds;
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
				google_analytics: false
			};

			const [facebookAccountExists, googleAdsAccountExists, googleAnalyticsPropertyExists] = await Promise.all([
				this.redisClient.exists(`facebook_ads_account:${storeId}`),
				this.redisClient.exists(`google_ads_account:${storeId}`),
				this.redisClient.exists(`google_analytics_property:${storeId}`)
			]);

			if (facebookAccountExists) {
				connections.facebook_ads = await new FacebookController(this.redisClient).getFacebookAccountByStoreId(storeId);
			}

			if (googleAdsAccountExists) {
				connections.google_ads = await new GoogleController(this.redisClient).getGoogleAdsAccountByStoreId(storeId);
			}

			if (googleAnalyticsPropertyExists) {
				connections.google_analytics = await new GoogleController(this.redisClient).getGoogleAnalyticsPropertyByStoreId(storeId);
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

	async getShopAccessToken(store, authCode) {
		try {
			const response = await axios.post(`https://${store}/admin/oauth/access_token?client_id=${process.env.SHOPIFY_API_KEY}&client_secret=${process.env.SHOPIFY_API_SECRET}&code=${authCode}`);
			return response.data;
		} catch (error) {
			logger.error("Failed to exchange authorization code for access token: %s", error);
			throw error;
		}
	};

	async fetchStoreOrders({ storeId, start, end }) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const allOrders = [];
			let ordersEndpoint = `${getStoreApiURL(storeId)}/orders.json`;
			let params = {
				created_at_min: new Date(start),
				created_at_max: new Date(end),
				financial_status: 'paid',
				status: 'any',
				limit: 250
			}
			while (ordersEndpoint) {
				const response = await axios.get(ordersEndpoint, {
					params,
					headers: {
						'X-Shopify-Access-Token': accessToken
					}
				});

				const trueOrders = response.data.orders.filter(order => order.cancelled_at === null);
				allOrders.push(...trueOrders);
				ordersEndpoint = extractHttpsUrl(response.headers.link);
				params = undefined;
			};

			return allOrders;
		} catch (error) {
			logger.error("Failed to fetch orders: %s", error);
			throw error;
		};
	};

	async fetchStoreAbandonedCheckouts({ storeId, start, end }) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const abandonedCheckouts = [];

			let abandonedCheckoutEndpoint = `${getStoreApiURL(storeId)}/checkouts.json`;
			let params = {
				created_at_min: start,
				created_at_max: end,
				limit: 250
			};

			while (abandonedCheckoutEndpoint) {
				const response = await axios.get(abandonedCheckoutEndpoint, {
					params,
					headers: {
						'X-Shopify-Access-Token': accessToken
					}
				});

				const { checkouts } = response.data;
				abandonedCheckouts.push(...checkouts);
				abandonedCheckoutEndpoint = extractHttpsUrl(response.headers.link);
				params = undefined; // Clear original query parameters to prevent errors on subsequent requests
			}

			return abandonedCheckouts;
		} catch (error) {
			logger.error('Failed to fetch abandoned checkouts: %s', error);
			throw error;
		}
	};

	async fetchStoreProducts(storeId) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const allProducts = [];

			let productsEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;
			let query = `query ( $numProducts: Int!, $cursor: String){
				products(first: $numProducts, after: $cursor) {
					nodes {
						id
						title
						handle
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}`;
			const numProducts = 250;
			let cursor = null;
			let variables = { numProducts, cursor }
			do {
				const response = await axios.post(productsEndpoint,
					{
						query,
						variables
					},
					{
						headers: {
							'Content-Type': 'application/json',
							'X-Shopify-Access-Token': accessToken
						}
					});

				allProducts.push(...response.data.data.products.nodes)
				const { hasNextPage, endCursor } = response.data.data.products.pageInfo;
				variables.cursor = hasNextPage ? endCursor : null;
			} while (variables.cursor);

			return allProducts;
		} catch (error) {
			logger.error('Failed to fetch abandoned checkouts %s', error);
			throw error;
		};
	};

	async deleteStoreData(storeId, userId) {
		try {
			await this.redisClient.del(`facebook_ads_account:${storeId}`);
			await this.redisClient.del(`google_ads_account:${storeId}`);
			await this.redisClient.del(`store:${storeId}`);
			userId && await this.redisClient.srem(`user_stores:${userId}`, storeId);
		} catch (error) {
			logger.error(`Failed to delete data for store '${store}': %s`, error);
			throw error;
		}
	}
};

module.exports = StoreController;
