const logger = require('../utils/logger');
const { getStoreApiURL, extractHttpsUrl, extractTimezoneOffset } = require('../utils/shop');
const axios = require('axios');
const GoogleController = require('./google');
const FacebookController = require('./facebook');
const readline = require('readline');
const fs = require('fs');

class StoreController {
	constructor(redisClient) {
		this.redisClient = redisClient;
		this.webhookUrl = process.env.NODE_ENV === "development" ? process.env.TUNNEL_URL : process.env.URL
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
			const { data } = await axios.get(`${getStoreApiURL(store.name)}/shop.json`, {
				headers: {
					'X-Shopify-Access-Token': store.shopifyAccessToken
				}
			});
			await this.redisClient.hset(`store:${store.name}`, { ...store, ...data.shop });
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

	async fetchStoreOrders(storeId, start, end) {
		try {
			const allOrders = [];

			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken')
			const timezoneOffset = extractTimezoneOffset(await this.redisClient.hget(`store:${storeId}`, 'timezone'));

			let ordersEndpoint = `${getStoreApiURL(storeId)}/orders.json`;
			let params = {
				created_at_min: start + 'T00:00:00' + timezoneOffset,
				created_at_max: end + 'T23:59:59' + timezoneOffset,
				financial_status: 'paid',
				status: 'any',
				limit: 250
			};

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

	// very expensive query! https://shopify.dev/docs/api/usage/bulk-operations/queries
	async submitBulkProductVariantsQuery(storeId) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

			const bulkOperationQuery = `
			mutation {
				bulkOperationRunQuery(
				 query: """
					{
						products {
							edges {
								node {
									id
									handle
									title
									priceRangeV2 {
										maxVariantPrice {
											amount
											currencyCode
										}
										minVariantPrice {
											amount
											currencyCode
										}
									}
									featuredImage {
										altText
										height
										url
										width
									}
								}
							}
						}
					}
					"""
				) {
					bulkOperation {
						id
						status
					}
					userErrors {
						field
						message
					}
				}
			}
			`;

			await axios.post(graphqlEndpoint,
				{
					query: bulkOperationQuery
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'X-Shopify-Access-Token': accessToken
					}
				}
			);

			logger.info(`Submitted bulk product variants query for store '${storeId}'`);
		} catch (error) {
			logger.error('Failed to submit bulk products query\n%s', error);
			throw error;
		};
	};

	async readProductVariantsFromJSONL(storeId, graphqlApiId) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;
			const products = [];
			const bulkOperationUrlQuery = `
				query {
					node(id: "${graphqlApiId}") {
						... on BulkOperation {
							url
							partialDataUrl
						}
					}
				}
			`;

			const bulkOperationUrlResponse = await axios.post(graphqlEndpoint,
				{
					query: bulkOperationUrlQuery
				}, {
				headers: {
					'Content-Type': 'application/json',
					'X-Shopify-Access-Token': accessToken
				}
			});

			const { url } = bulkOperationUrlResponse.data.data.node;

			const productsJSONLResponse = await axios.get(url, {
				responseType: 'stream'
			});

			const readInterface = readline.createInterface({
				input: productsJSONLResponse.data
			});

			for await (const line of readInterface) {
				products.push(line);
			}

			return products;
		} catch (error) {
			logger.error('Failed to fetch products\n%s', error);
			throw error;
		};
	};

	async fetchStoreProductOrders(storeId, start, end) {
		try {
			const products = await this.readStoreProducts(storeId);
			const orders = await this.fetchStoreOrders(storeId, start, end);
			const productSalesMap = new Map();
			orders.forEach(order => {
				order.line_items.forEach(product => {
					const { product_id, title, price, handle } = product;
					if (productSalesMap.has(product_id)) {
						const currentData = productSalesMap.get(product_id);
						productSalesMap.set(product_id, {
							name: title,
							handle,
							salesValue: currentData.salesValue + Number(price),
							totalOrders: currentData.totalOrders + 1
						});
					} else {
						productSalesMap.set(product_id, {
							name: title,
							salesValue: Number(price),
							totalOrders: 1
						});
					}
				});
			});

			const productOrders = products.map(product => {
				const { id, title, handle } = product;
				const productData = productSalesMap.get(Number(id));
				return {
					id,
					title,
					handle,
					salesValue: productData ? productData.salesValue : 0,
					totalOrders: productData ? productData.totalOrders : 0,
				}
			});

			return productOrders;
		} catch (error) {
			logger.error(`Failed to fetch product orders for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async fetchStoreProductOrdersByProductId(storeId, productId, start, end) {
		const products = await this.readStoreProducts(storeId);
		const product = products.find(product => product.id === productId);
		return product;
	};

	async deleteStoreData(storeId, userId) {
		try {
			await this.redisClient.del(`facebook_ads_account:${storeId}`);
			await this.redisClient.del(`google_ads_account:${storeId}`);
			await this.redisClient.del(`google_analytics_property:${storeId}`);
			await this.redisClient.del(`products:${storeId}`);
			await this.redisClient.del(`store:${storeId}`);
			userId && await this.redisClient.srem(`user_stores:${userId}`, storeId);
		} catch (error) {
			logger.error(`Failed to delete data for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async createAllProducts(storeId, products) {
		try {
			const redisKey = `products:${storeId}`;
			await this.redisClient.hmset(redisKey, ...products);
			logger.info(`Created ${products.length} products in store ${storeId}`);
		} catch (error) {
			logger.error(`Failed to create initial products for store '${storeId}': %s`, error);
			throw error;
		}
	}

	async createProduct(storeId, product) {
		try {
			const redisKey = `products:${storeId}`;
			const productId = String(product.id).split("/").slice(-1)[0];
			await this.redisClient.hset(redisKey, productId, JSON.stringify(product));
			logger.info(`Created product ${product.id} in store ${storeId}`);
		} catch (error) {
			logger.error(`Failed to create product for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async getProduct(storeId, productId) {
		try {
			const redisKey = `products:${storeId}`;
			const productData = await this.redisClient.hget(redisKey, productId);
			return productData ? JSON.parse(productData) : null;
		} catch (error) {
			logger.error(`Failed to get product '${productId}' for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async updateProduct(storeId, product) {
		try {
			const redisKey = `products:${storeId}`;
			await this.redisClient.hset(redisKey, product.id, JSON.stringify(product));
			logger.info(`Updated product ${product.id} in store ${storeId}`);
		} catch (error) {
			logger.error(`Failed to update single product for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async deleteProduct(storeId, productId) {
		try {
			const redisKey = `products:${storeId}`;
			await this.redisClient.hdel(redisKey, productId);
			logger.info(`Deleted product ${productId} in store ${storeId}`);
		} catch (error) {
			logger.error(`Failed to delete product '${productId}' for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async getAllProducts(storeId) {
		try {
			const redisKey = `products:${storeId}`;
			const productHash = await this.redisClient.hgetall(redisKey);
			return Object.values(productHash).map(JSON.parse);
		} catch (error) {
			logger.error(`Failed to get all products for store '${storeId}': %s`, error);
			throw error;
		}
	};

	async subscribeToBulkOperationsWebhook(storeId) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

			let webhookSubscriptionQuery = `
			mutation {
				webhookSubscriptionCreate(
					topic: BULK_OPERATIONS_FINISH
					webhookSubscription: {
						format: JSON,
						callbackUrl: "${this.webhookUrl}/shopify/webhooks/products-bulk-read"
					}
				) {
					userErrors {
						field
						message
					}
					webhookSubscription {
						id
					}
				}
			}
		`;

			const response = await axios.post(graphqlEndpoint,
				{
					query: webhookSubscriptionQuery
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'X-Shopify-Access-Token': accessToken
					}
				}
			);

			if (!!response.data?.data?.webhookSubscriptionCreate?.userErrors?.length) {
				throw response.data.data.webhookSubscriptionCreate.userErrors[0].message;
			};

			logger.info(`Subscribed to Shopify webhook topic 'bulk_operations/finish' for store '${storeId}'`);
		} catch (error) {
			logger.error("Failed to subscribe to Shopify webhook topic 'bulk_operations/finish': %s", error);
			throw error;
		}
	};

	async subscribeToStoreProductsWebhooks(storeId) {
		try {
			const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
			const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

			const webhookSubscriptionQuery = `			
			mutation SubscribeToProductWebhooks {
				createProductSubscription: webhookSubscriptionCreate(
					topic: PRODUCTS_CREATE
					webhookSubscription: {
						format: JSON,
						callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
					}
				) {
					userErrors {
						field
						message
					}
					webhookSubscription {
						id
					}
				}
		
				deleteProductSubscription: webhookSubscriptionCreate(
					topic: PRODUCTS_DELETE
					webhookSubscription: {
						format: JSON,
						callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
					}
				) {
					userErrors {
						field
						message
					}
					webhookSubscription {
						id
					}
				}
		
				updateProductSubscription: webhookSubscriptionCreate(
					topic: PRODUCTS_UPDATE
					webhookSubscription: {
						format: JSON,
						callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
					}
				) {
					userErrors {
						field
						message
					}
					webhookSubscription {
						id
					}
				}
			}
		`;


			const response = await axios.post(graphqlEndpoint,
				{
					query: webhookSubscriptionQuery
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'X-Shopify-Access-Token': accessToken
					}
				}
			);

			if (!!response.data?.errors?.length) {
				throw response.data.errors[0].message;
			};

			logger.info(`Subscribed to Shopify webhook topics ['products/create', 'products/delete', 'products/update'] for store '${storeId}'`)
		} catch (error) {
			logger.error("Failed to subscribe to Shopify webhook topics ['products/create', 'products/delete', 'products/update']: %s", error);
			throw error;
		}
	};

	async configureStoreWebhookSubscriptions(storeId) {
		try {
			await this.subscribeToBulkOperationsWebhook(storeId);
			await this.subscribeToStoreProductsWebhooks(storeId);

			logger.info(`Configured Shopify webhooks for store '${storeId}'`);
		} catch (error) {
			logger.error("Failed to configure store webhook subscriptions");
		}
	};

	async destroyStoreWebhookSubscriptions(storeId) {
		//TODO:
	}
};

module.exports = StoreController;
