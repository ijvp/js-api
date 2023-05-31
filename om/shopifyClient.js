const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2022-07');

const shopify = shopifyApi({
	apiKey: process.env.SHOPIFY_API_KEY,
	apiSecretKey: process.env.SHOPIFY_API_SECRET,
	scopes: ['read_orders,read_products,read_product_listings'],
	hostName: 'localhost:8080',
	hostScheme: 'http',
	apiVersion: LATEST_API_VERSION,
	isEmbeddedApp: false,
	logger: {
		log: (severity, message) => {
			console.log(severity, message)
		}
	},
	restResources
});

module.exports = shopify;
