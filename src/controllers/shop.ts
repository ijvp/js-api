import { Request, Response } from 'express';
import logger from '../utils/logger';
import ResourceController from './resource';
import { auth } from '../middleware/auth';
import { logIn } from '../utils/session';
import { verifyHMAC } from '../middleware/shopify';
import ShopifyService from '../clients/shopify';
import { Session } from '@shopify/shopify-api';


export default class ShopController extends ResourceController {
	shopifyService: ShopifyService;

	constructor() {
		super('/shopify');
		this.shopifyService = new ShopifyService();
		this.initializeRoutes();
	};

	//callback should store userId: <store domain> in session
	//session can use userId to get shopify_sessions:<userId>
	initializeRoutes(): void {
		this.router.get('/login', this.loginToShop.bind(this));
		this.router.get('/auth', this.shopifyService.getAuthMiddleware().begin());
		this.router.get('/auth/callback',
			verifyHMAC,
			this.shopifyService.getAuthMiddleware().callback(),
			(req, res, next) => {
				if (req.query.shop) {
					logIn(req, req.query.shop.toString());
					//TODO: redirect /auth/login ?
				} else {
					next(new Error('Missing shop parameter'));
				}
				next();
			},
			this.shopifyService.redirectOnAuthCompletion()
		);
		this.router.get('/orders', auth, this.shopifyService.validateAuthenticatedSession(), this.getOrders.bind(this));
	}

	loginToShop(req: Request, res: Response) {
		const storeLoginURL = 'https://accounts.shopify.com/store-login?redirect=' +
			encodeURIComponent(`/admin/oauth/authorize
				?client_id=${process.env.SHOPIFY_CLIENT_ID}
				&redirect_uri=${this.shopifyService.getFullAuthCallbackURL()}
				&scope=${process.env.SHOPIFY_SCOPES}`
			);

		res.redirect(storeLoginURL);
	}

	async getOrders(req: Request, res: Response) {
		const session: Session = res.locals.shopify.session;
		const data = await this.shopifyService.getLastTenOrders(session);
		res.status(200).json(data);
	};


	// async createStore(store) {
	// 	try {
	// 		const { data } = await axios.get(`${getStoreApiURL(store.name)}/shop.json`, {
	// 			headers: {
	// 				'X-Shopify-Access-Token': store.shopifyAccessToken
	// 			}
	// 		});
	// 		await this.redisClient.hset(`store:${store.name}`, { ...store, ...data.shop });
	// 		logger.info(`Store '${store.name}' hash persisted`);
	// 	} catch (error) {
	// 		logger.error(error);
	// 		throw error;
	// 	}
	// };

	// async getStoresByUserId(userId) {
	// 	try {
	// 		const storeIds = await this.redisClient.smembers(`user_stores:${userId}`);
	// 		return storeIds;
	// 	} catch (error) {
	// 		logger.error('Error retrieving stores by user ID: %s', error);
	// 		throw error;
	// 	};
	// };

	// async getStoreConnections(storeId) {
	// 	try {
	// 		const connections = {
	// 			facebook_ads: false,
	// 			google_ads: false,
	// 			google_analytics: false
	// 		};

	// 		const [facebookAccountExists, googleAdsAccountExists, googleAnalyticsPropertyExists] = await Promise.all([
	// 			this.redisClient.exists(`facebook_ads_account:${storeId}`),
	// 			this.redisClient.exists(`google_ads_account:${storeId}`),
	// 			this.redisClient.exists(`google_analytics_property:${storeId}`)
	// 		]);

	// 		if (facebookAccountExists) {
	// 			connections.facebook_ads = await new FacebookController(this.redisClient).getFacebookAccountByStoreId(storeId);
	// 		}

	// 		if (googleAdsAccountExists) {
	// 			connections.google_ads = await new GoogleController(this.redisClient).getGoogleAdsAccountByStoreId(storeId);
	// 		}

	// 		if (googleAnalyticsPropertyExists) {
	// 			connections.google_analytics = await new GoogleController(this.redisClient).getGoogleAnalyticsPropertyByStoreId(storeId);
	// 		}

	// 		return connections;
	// 	} catch (error) {
	// 		logger.error('Error retrieving store connections: %s', error);
	// 		throw error;
	// 	}
	// };

	// async associateStoreWithUser(storeId, userId) {
	// 	try {
	// 		await this.redisClient.sadd(`user_stores:${userId}`, storeId);
	// 		logger.info(`Store '${storeId}' associated with user '${userId}'`);
	// 	} catch (error) {
	// 		logger.error(error);
	// 		throw error;
	// 	};
	// };

	// async getShopAccessToken(store, authCode) {
	// 	try {
	// 		const response = await axios.post(`https://${store}/admin/oauth/access_token?client_id=${process.env.SHOPIFY_API_KEY}&client_secret=${process.env.SHOPIFY_API_SECRET}&code=${authCode}`);
	// 		return response.data;
	// 	} catch (error) {
	// 		logger.error("Failed to exchange authorization code for access token: %s", error);
	// 		throw error;
	// 	}
	// };

	// async deleteStoreData(storeId, userId) {
	// 	try {
	// 		await this.redisClient.del(`facebook_ads_account:${storeId}`);
	// 		await this.redisClient.del(`google_ads_account:${storeId}`);
	// 		await this.redisClient.del(`google_analytics_property:${storeId}`);
	// 		await this.redisClient.del(`products:${storeId}`);
	// 		await this.redisClient.del(`store:${storeId}`);
	// 		userId && await this.redisClient.srem(`user_stores:${userId}`, storeId);
	// 	} catch (error) {
	// 		logger.error(`Failed to delete data for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// //START ORDERS
	// async fetchStoreOrders(storeId, start, end) {
	// 	try {
	// 		const allOrders = [];

	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken')
	// 		const timezoneOffset = extractTimezoneOffset(await this.redisClient.hget(`store:${storeId}`, 'timezone'));

	// 		let ordersEndpoint = `${getStoreApiURL(storeId)}/orders.json`;
	// 		let params = {
	// 			created_at_min: start + 'T00:00:00' + timezoneOffset,
	// 			created_at_max: end + 'T23:59:59' + timezoneOffset,
	// 			financial_status: 'paid',
	// 			status: 'any',
	// 			limit: 250
	// 		};

	// 		while (ordersEndpoint) {
	// 			const response = await axios.get(ordersEndpoint, {
	// 				params,
	// 				headers: {
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			});

	// 			const trueOrders = response.data.orders.filter(order => order.cancelled_at === null);
	// 			allOrders.push(...trueOrders);
	// 			ordersEndpoint = extractHttpsUrl(response.headers.link);
	// 			params = undefined;
	// 		};

	// 		return allOrders;
	// 	} catch (error) {
	// 		logger.error("Failed to fetch orders: %s", error);
	// 		throw error;
	// 	};
	// };

	// async fetchOrdersByProductId(storeId, productId, start, end) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

	// 		const ordersQuery = `
	// 			query {
	// 				orders(first: 250, query: "created_at:>=${start} created_at:<=${end}") {
	// 					edges {
	// 						node {
	// 							id
	// 							lineItems(first: 250) {
	// 								edges {
	// 									node {
	// 										quantity
	// 										product {
	// 											title
	// 											priceRangeV2 {
	// 												maxVariantPrice {
	// 													amount
	// 													currencyCode
	// 												}
	// 												minVariantPrice {
	// 													amount
	// 													currencyCode
	// 												}
	// 											}
	// 										}
	// 									}
	// 								}
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		`;

	// 		const response = await axios.post(graphqlEndpoint,
	// 			{
	// 				query: ordersQuery
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			}
	// 		);

	// 		if (!!response.data.errors?.length) {
	// 			throw response.data.errors[0].message
	// 		};

	// 		console.log(response.data.data.orders.edges[0].node.lineItems.edges[0].node);
	// 		return response.data.data;
	// 	} catch (error) {
	// 		logger.error('Failed to fetch product orders\n%s', error);
	// 		throw error;
	// 	}
	// };

	// async fetchStoreAbandonedCheckouts({ storeId, start, end }) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const abandonedCheckouts = [];

	// 		let abandonedCheckoutEndpoint = `${getStoreApiURL(storeId)}/checkouts.json`;
	// 		let params = {
	// 			created_at_min: start,
	// 			created_at_max: end,
	// 			limit: 250
	// 		};

	// 		while (abandonedCheckoutEndpoint) {
	// 			const response = await axios.get(abandonedCheckoutEndpoint, {
	// 				params,
	// 				headers: {
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			});

	// 			const { checkouts } = response.data;
	// 			abandonedCheckouts.push(...checkouts);
	// 			abandonedCheckoutEndpoint = extractHttpsUrl(response.headers.link);
	// 			params = undefined; // Clear original query parameters to prevent errors on subsequent requests
	// 		}

	// 		return abandonedCheckouts;
	// 	} catch (error) {
	// 		logger.error('Failed to fetch abandoned checkouts: %s', error);
	// 		throw error;
	// 	}
	// };
	// //END ORDERS

	// //START PRODUCTS CRUD
	// async createAllProducts(storeId, products) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		await this.redisClient.hmset(redisKey, ...products);
	// 		logger.info(`Created ${products.length} products in store ${storeId}`);
	// 	} catch (error) {
	// 		logger.error(`Failed to create initial products for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// async createProduct(storeId, product) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		const productId = String(product.id).split("/").slice(-1)[0];
	// 		await this.redisClient.hset(redisKey, productId, JSON.stringify(product));
	// 		logger.info(`Created product ${product.id} in store ${storeId}`);
	// 	} catch (error) {
	// 		logger.error(`Failed to create product for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// async fetchProduct(storeId, productId) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

	// 		const productQuery = `
	// 			query getProductById($id: ID!) {
	// 				product(id: $id) {
	// 					id
	// 					handle
	// 					title
	// 					description
	// 					priceRangeV2 {
	// 						maxVariantPrice {
	// 							amount
	// 							currencyCode
	// 						}
	// 						minVariantPrice {
	// 							amount
	// 							currencyCode
	// 						}
	// 					}
	// 					featuredImage {
	// 						altText
	// 						height
	// 						url
	// 						width
	// 					}
	// 				}
	// 			}
	// 		`

	// 		const response = await axios.post(graphqlEndpoint,
	// 			{
	// 				query: productQuery,
	// 				variables: { id: productId }
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			});

	// 		return response.data.data.product;
	// 	} catch (error) {
	// 		logger.error(`Failed to fetch product '${productId}' query\n%s`, error);
	// 		throw error;
	// 	}
	// };

	// async getAllProducts(storeId) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		const productHash = await this.redisClient.hgetall(redisKey);
	// 		return Object.values(productHash).map(JSON.parse);
	// 	} catch (error) {
	// 		logger.error(`Failed to get all products for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// async getProduct(storeId, productId) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		const productData = await this.redisClient.hget(redisKey, productId);
	// 		return productData ? JSON.parse(productData) : null;
	// 	} catch (error) {
	// 		logger.error(`Failed to get product '${productId}' for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// async updateProduct(storeId, product) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		const productId = Number(String(product.id).split("/").slice(-1)[0]);
	// 		await this.redisClient.hset(redisKey, productId, JSON.stringify(product));
	// 		logger.info(`Updated product ${product.id} in store ${storeId}`);
	// 	} catch (error) {
	// 		logger.error(`Failed to update single product for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };

	// async deleteProduct(storeId, productId) {
	// 	try {
	// 		const redisKey = `products:${storeId}`;
	// 		await this.redisClient.hdel(redisKey, productId);
	// 		logger.info(`Deleted product ${productId} in store ${storeId}`);
	// 	} catch (error) {
	// 		logger.error(`Failed to delete product '${productId}' for store '${storeId}': %s`, error);
	// 		throw error;
	// 	}
	// };
	// //END PRODUCTS CRUD

	// //START WEBHOOKS
	// // very expensive query! https://shopify.dev/docs/api/usage/bulk-operations/queries
	// async submitBulkProductVariantsQuery(storeId) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

	// 		const bulkOperationQuery = `
	// 			mutation {
	// 				bulkOperationRunQuery(
	// 				 query: """
	// 					{
	// 						products {
	// 							edges {
	// 								node {
	// 									id
	// 									handle
	// 									title
	// 									description
	// 									priceRangeV2 {
	// 										maxVariantPrice {
	// 											amount
	// 											currencyCode
	// 										}
	// 										minVariantPrice {
	// 											amount
	// 											currencyCode
	// 										}
	// 									}
	// 									featuredImage {
	// 										altText
	// 										height
	// 										url
	// 										width
	// 									}
	// 								}
	// 							}
	// 						}
	// 					}
	// 					"""
	// 				) {
	// 					bulkOperation {
	// 						id
	// 						status
	// 					}
	// 					userErrors {
	// 						field
	// 						message
	// 					}
	// 				}
	// 			}
	// 			`;

	// 		await axios.post(graphqlEndpoint,
	// 			{
	// 				query: bulkOperationQuery
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			}
	// 		);

	// 		logger.info(`Submitted bulk product variants query for store '${storeId}'`);
	// 	} catch (error) {
	// 		logger.error('Failed to submit bulk products query\n%s', error);
	// 		throw error;
	// 	};
	// };

	// async readProductVariantsFromJSONL(storeId, graphqlApiId) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;
	// 		const products = [];
	// 		const bulkOperationUrlQuery = `
	// 				query {
	// 					node(id: "${graphqlApiId}") {
	// 						... on BulkOperation {
	// 							url
	// 							partialDataUrl
	// 						}
	// 					}
	// 				}
	// 			`;

	// 		const bulkOperationUrlResponse = await axios.post(graphqlEndpoint,
	// 			{
	// 				query: bulkOperationUrlQuery
	// 			}, {
	// 			headers: {
	// 				'Content-Type': 'application/json',
	// 				'X-Shopify-Access-Token': accessToken
	// 			}
	// 		});

	// 		const { url } = bulkOperationUrlResponse.data.data.node;

	// 		const productsJSONLResponse = await axios.get(url, {
	// 			responseType: 'stream'
	// 		});

	// 		const readInterface = readline.createInterface({
	// 			input: productsJSONLResponse.data
	// 		});

	// 		for await (const line of readInterface) {
	// 			products.push(line);
	// 		}

	// 		return products;
	// 	} catch (error) {
	// 		logger.error('Failed to fetch products\n%s', error);
	// 		throw error;
	// 	};
	// };

	// async subscribeToBulkOperationsWebhook(storeId) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

	// 		let webhookSubscriptionQuery = `
	// 		mutation {
	// 			webhookSubscriptionCreate(
	// 				topic: BULK_OPERATIONS_FINISH
	// 				webhookSubscription: {
	// 					format: JSON,
	// 					callbackUrl: "${this.webhookUrl}/shopify/webhooks/products-bulk-read"
	// 				}
	// 			) {
	// 				userErrors {
	// 					field
	// 					message
	// 				}
	// 				webhookSubscription {
	// 					id
	// 				}
	// 			}
	// 		}
	// 	`;

	// 		const response = await axios.post(graphqlEndpoint,
	// 			{
	// 				query: webhookSubscriptionQuery
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			}
	// 		);

	// 		if (!!response.data?.data?.webhookSubscriptionCreate?.userErrors?.length) {
	// 			throw response.data.data.webhookSubscriptionCreate.userErrors[0].message;
	// 		};

	// 		logger.info(`Subscribed to Shopify webhook topic 'bulk_operations/finish' for store '${storeId}'`);
	// 	} catch (error) {
	// 		logger.error("Failed to subscribe to Shopify webhook topic 'bulk_operations/finish': %s", error);
	// 		throw error;
	// 	}
	// };

	// async subscribeToStoreProductsWebhooks(storeId) {
	// 	try {
	// 		const accessToken = await this.redisClient.hget(`store:${storeId}`, 'shopifyAccessToken');
	// 		const graphqlEndpoint = `${getStoreApiURL(storeId)}/graphql.json`;

	// 		const webhookSubscriptionQuery = `			
	// 		mutation SubscribeToProductWebhooks {
	// 			createProductSubscription: webhookSubscriptionCreate(
	// 				topic: PRODUCTS_CREATE
	// 				webhookSubscription: {
	// 					format: JSON,
	// 					callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
	// 				}
	// 			) {
	// 				userErrors {
	// 					field
	// 					message
	// 				}
	// 				webhookSubscription {
	// 					id
	// 				}
	// 			}

	// 			deleteProductSubscription: webhookSubscriptionCreate(
	// 				topic: PRODUCTS_DELETE
	// 				webhookSubscription: {
	// 					format: JSON,
	// 					callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
	// 				}
	// 			) {
	// 				userErrors {
	// 					field
	// 					message
	// 				}
	// 				webhookSubscription {
	// 					id
	// 				}
	// 			}

	// 			updateProductSubscription: webhookSubscriptionCreate(
	// 				topic: PRODUCTS_UPDATE
	// 				webhookSubscription: {
	// 					format: JSON,
	// 					callbackUrl: "${this.webhookUrl}/shopify/webhooks/product"
	// 				}
	// 			) {
	// 				userErrors {
	// 					field
	// 					message
	// 				}
	// 				webhookSubscription {
	// 					id
	// 				}
	// 			}
	// 		}
	// 	`;


	// 		const response = await axios.post(graphqlEndpoint,
	// 			{
	// 				query: webhookSubscriptionQuery
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Shopify-Access-Token': accessToken
	// 				}
	// 			}
	// 		);

	// 		if (!!response.data?.errors?.length) {
	// 			throw response.data.errors[0].message;
	// 		};

	// 		logger.info(`Subscribed to Shopify webhook topics ['products/create', 'products/delete', 'products/update'] for store '${storeId}'`)
	// 	} catch (error) {
	// 		logger.error("Failed to subscribe to Shopify webhook topics ['products/create', 'products/delete', 'products/update']: %s", error);
	// 		throw error;
	// 	}
	// };

	// async configureStoreWebhookSubscriptions(storeId) {
	// 	try {
	// 		await this.subscribeToBulkOperationsWebhook(storeId);
	// 		await this.subscribeToStoreProductsWebhooks(storeId);

	// 		logger.info(`Configured Shopify webhooks for store '${storeId}'`);
	// 	} catch (error) {
	// 		logger.error("Failed to configure store webhook subscriptions");
	// 	}
	// };

	// async destroyStoreWebhookSubscriptions(storeId) {
	// 	//TODO:
	// };
	// //END WEBHOOKS
};
