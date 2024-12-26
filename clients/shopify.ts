import { ApiVersion } from '@shopify/shopify-api';
import { ShopifyApp, shopifyApp } from '@shopify/shopify-app-express';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';


class ShopifyClient {
    public readonly shopify: ShopifyApp;
	
    constructor() {
        this.shopify = shopifyApp({
            api: {
                apiKey: process.env.SHOPIFY_CLIENT_ID,
                apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
                apiVersion: process.env.SHOPIFY_API_VERSION as ApiVersion,
                scopes: [process.env.SHOPIFY_SCOPES],
                hostName: process.env.NODE_ENV === 'development' ? process.env.TUNNEL_URL : process.env.URL,
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
    }
}

export default ShopifyClient;