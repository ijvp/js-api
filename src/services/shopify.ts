import { ApiVersion, DeliveryMethod, GraphqlClient, Session } from '@shopify/shopify-api';
import { ShopifyApp, shopifyApp, WebhookHandlersParam } from '@shopify/shopify-app-express';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import logger from '../utils/logger';

export default class ShopifyService {
	public readonly shopify: ShopifyApp;

	constructor() {
		this.shopify = shopifyApp({
			api: {
				apiKey: process.env.SHOPIFY_CLIENT_ID,
				apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
				apiVersion: process.env.SHOPIFY_API_VERSION as ApiVersion,
				scopes: process.env.SHOPIFY_SCOPES!.split(','),
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

	public beginAuth() {
		return this.shopify.auth.begin();
	}

	public authCallback() {
		return this.shopify.auth.callback();
	}

	public redirectOnAuthCompletion() {
		return this.shopify.redirectToShopifyOrAppRoot();
	};

	public validateSession() {
		return this.shopify.validateAuthenticatedSession();
	};

	public processWebhooks() {
		const webhookHandlers: WebhookHandlersParam = {
			CUSTOMERS_DATA_REQUEST: {
				deliveryMethod: DeliveryMethod.Http,
				callbackUrl: this.shopify.config.webhooks.path,
				callback: async (topic: any, shop: any, body: string, webhookId: any, apiVersion: any) => {
					const payload = JSON.parse(body);
					logger.info(`Processing webhook for shop ${shop.domain}: ${webhookId} ${topic}`);
					// prepare customers data to send to customer
				},
			},
			CUSTOMERS_REDACT: {
				deliveryMethod: DeliveryMethod.Http,
				callbackUrl: this.shopify.config.webhooks.path,
				callback: async (topic: any, shop: any, body: string, webhookId: any, apiVersion: any) => {
					const payload = JSON.parse(body);
					logger.info(`Processing webhook for shop ${shop.domain}: ${webhookId} ${topic}`);
					// remove customers data
				},
			},
			SHOP_REDACT: {
				deliveryMethod: DeliveryMethod.Http,
				callbackUrl: this.shopify.config.webhooks.path,
				callback: async (topic: any, shop: any, body: string, webhookId: any, apiVersion: any) => {
					const payload = JSON.parse(body);
					logger.info(`Processing webhook for shop ${shop.domain}: ${webhookId} ${topic}`);
					// remove shop data
				},
			},
		};

		return this.shopify.processWebhooks({ webhookHandlers });
	};

	public async getLastTenOrders(session: Session) {
		try {
			if (!session) {
				throw new Error('Session is required');
			}

			const client: GraphqlClient = new this.shopify.api.clients.Graphql({ session });
			const response: { body: { data: any } } = await client.query({
				data: `{
					orders(first: 10) {
						edges {
							node {
								id
							}
						}
					}
				}`
			});

			if (response.body) {
				return response.body.data;
			}
		} catch (error) {
			logger.error(error);
		}
	};

	//HELPERS

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
