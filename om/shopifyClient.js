// const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2023-04');
const { shopifyApp } = require('@shopify/shopify-app-express');
const { RedisSessionStorage } = require('@shopify/shopify-app-session-storage-redis');

const shopify = shopifyApp({
	api: {
		apiKey: process.env.SHOPIFY_API_KEY,
		apiSecretKey: process.env.SHOPIFY_API_SECRET,
		scopes: ['read_orders,read_products,read_product_listings'],
		hostName: 'localhost:8080',
		hostScheme: 'http',
		isEmbeddedApp: false,
		restResources
	},
	auth: {
		path: '/shopify/auth',
		callbackPath: '/shopify/auth/callback'
	},
	webhooks: {
		path: '/api/webhooks'
	},
	sessionStorage: new RedisSessionStorage(
		process.env.REDIS_URL,
		{
			sessionKeyPrefix: "shopify_sessions:"
		}
	)
});

module.exports = shopify;
