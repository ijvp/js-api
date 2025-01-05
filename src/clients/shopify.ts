import { ApiVersion, GraphqlClient } from '@shopify/shopify-api';
import { ShopifyApp, shopifyApp } from '@shopify/shopify-app-express';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import logger from '../utils/logger';

export default class ShopifyService {
	public readonly shopify: ShopifyApp;
	// public readonly graphqlClient: GraphqlClient;


	constructor() {
		this.shopify = shopifyApp({
			api: {
				apiKey: process.env.SHOPIFY_CLIENT_ID,
				apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
				apiVersion: process.env.SHOPIFY_API_VERSION as ApiVersion,
				scopes: [process.env.SHOPIFY_SCOPES!],
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
	};

	public getAuthMiddleware() {
		return this.shopify.auth;
	};

	public redirectOnAuthCompletion() {
		return this.shopify.redirectToShopifyOrAppRoot();
	};

	// public getOrders() {
	// 	// Fetch orders from Shopify
	// 	this.graphqlClient.query({
	// 		data: `{
	// 			orders(first: 10) {
	// 				edges {
	// 					node {
	// 						id
	// 						name
	// 					}
	// 				}
	// 			}
	// 		}`
	// 	}).catch((error) => {
	// 		logger.error(error);
	// 	});
	// };

	//useful for multi shop login redirect
	public getFullAuthCallbackURL(): string {
		const scheme = this.shopify.api.config.hostScheme;
		const host = this.shopify.api.config.hostName;
		const path = this.shopify.config.auth.callbackPath;

		return `${scheme}://${host}${path}`;
	};
};
