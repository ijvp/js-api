const { restResources } = require('@shopify/shopify-api/rest/admin/2023-04');
const { shopifyApp } = require('@shopify/shopify-app-express');
const { RedisSessionStorage } = require('@shopify/shopify-app-session-storage-redis');

const shopify = shopifyApp({
	api: {
		apiKey: process.env.SHOPIFY_API_KEY,
		apiSecretKey: process.env.SHOPIFY_API_SECRET,
		scopes: [process.env.SHOPIFY_SCOPES],
		hostName: process.env.URL,
		hostScheme: process.env.NODE_ENV === 'development' ? 'http' : 'https',
		isEmbeddedApp: false,
		restResources
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
			sessionKeyPrefix: "shopify_sessions:"
		}
	)
});

export default shopify;
