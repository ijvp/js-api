import { ApiVersion } from '@shopify/shopify-api';
import { ShopifyApp, shopifyApp } from '@shopify/shopify-app-express';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import logger from '../utils/logger';

class ShopifyClient {
	public readonly shopify: ShopifyApp;
	public readonly graphqlClient: any;

	constructor() {
		this.shopify = shopifyApp({
			api: {
				apiKey: process.env.SHOPIFY_CLIENT_ID,
				apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
				apiVersion: process.env.SHOPIFY_API_VERSION as ApiVersion,
				scopes: [process.env.SHOPIFY_SCOPES],
				hostName: process.env.URL,
				hostScheme: 'https',
				isEmbeddedApp: false
			},
			auth: {
				path: '/shopify/auth',
				callbackPath: '/shopify/auth/callback'
			},
			webhooks: {
				path: '/shopify/webhooks'
			},
			sessionStorage: new RedisSessionStorage(
				`redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
				{
					sessionKeyPrefix: "shopify_sessions:",
				}
			)
		});

		// const sessionId = await shopify.session.getCurrentId({
		// 	isOnline: true,
		// 	rawRequest: req,
		// 	rawResponse: res,
		//   });
		// const session = await shopify.session.retrieve(sessionId);
		// this.graphqlClient = new this.shopify.api.clients.Graphql({ session });
	}

	public getOrders() {
		// Fetch orders from Shopify
		this.shopify.api.clients.Graphql.cl({
			data: `{
				orders(first: 10) {
					edges {
						node {
							id
							name
						}
					}
				}
			}`
		}).then(result => result.json())
			.catch((error) => {
				logger.error(error);
			});
	}
}

export default ShopifyClient;