// import express, { Request, Response, Router, NextFunction } from 'express';
// import logger from '../utils/logger';
// import { logIn, logOut } from '../utils/session';
// import { encrypt, decrypt } from '../utils/crypto';
// import { User } from '../models/User';
// import { auth } from '../middleware/auth';
// import ShopController from '../controllers/shop';
// const { getMetrics, getSessionFromStorage } = require('../utils/shop');
// const { storeExists } = require('../middleware/store');
// const { shopify, redis } = require('../clients');
// const { verifyWebhook } = require('../middleware/webhook');

// export default class ShopController {}
// const shopController = new ShopController(redis.redisClient);

// router.get('/shopify/authorize', auth, (req, res) => {
// 	const url = process.env.NODE_ENV === "development" ? process.env.TUNNEL_URL : process.env.URL;
// 	const redirectUri = `${url}${shopify.config.auth.callbackPath}`;
// 	const authorizationUrl = 'https://accounts.shopify.com/store-login?redirect=' + encodeURIComponent(`/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&redirect_uri=${redirectUri}&scope=${process.env.SHOPIFY_SCOPES}`);
// 	return res.status(200).json(authorizationUrl);
// });

// router.get(shopify.config.auth.path, (req, res) => {
// 	const { shop, hmac, timestamp } = req.query;
// 	res.redirect(`//${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.URL}${shopify.config.auth.callbackPath}&state=0978142396815234`)
// });

// router.get(shopify.config.auth.callbackPath, async (req, res) => {
// 	try {
// 		const { code, hmac, shop, state } = req.query;
// 		const { access_token, scope } = await shopController.getShopAccessToken(shop, code);

// 		const store = {
// 			name: shop,
// 			shopifyAccessToken: access_token,
// 			scope
// 		};

// 		await storeController.createStore(store);
// 		await storeController.configureStoreWebhookSubscriptions(store.name);
// 		await storeController.submitBulkProductVariantsQuery(store.name);

// 		if (req.session.userId) {
// 			await storeController.associateStoreWithUser(store.name, req.session.userId);
// 			return res.redirect(process.env.FRONTEND_URL);
// 		} else {
// 			// encripta nome da loja, redireciona para pagina de registrar usuario
// 			// ao mandar a requisição para /auth/register, decripta e chama
// 			// associateStoreWithUser com id do usuario novo
// 			return res.redirect(`${process.env.FRONTEND_URL}/register?guid=${encodeURIComponent(encrypt(shop))}`);
// 		}

// 	} catch (error) {
// 		logger.error(error);
// 		res.redirect(`${process.env.FRONTEND_URL}?shopify-install-error=true`);
// 	}
// });

// //currently only returns paid orders
// //parameters: store: String, start (Date), end (Date), granularity: 'day' | 'hour',
// //triplewhale additional parameters: match? [], metricsBreakdown: boolean, shopId (shop.name)
// // router.post('/shopify/orders', auth, storeExists, async (req, res) => {
// // 	const { store, start, end, granularity } = req.body;

// // 	if (!(store && start && granularity)) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body' })
// // 	};

// // 	try {
// // 		//frontend must set start and end to the same date for a single day of data, granularity must be 'hour'!
// // 		const orders = await storeController.fetchStoreOrders(store, start, end);
// // 		return res.json(getMetrics(orders, granularity));
// // 	} catch (error) {
// // 		return res.status(500).json({ success: false, error: 'Internal Server Error' });
// // 	};
// // });

// // router.post('/shopify/abandoned-checkouts', auth, storeExists, async (req, res) => {
// // 	const { store, start, end, granularity } = req.body;

// // 	if (!(store && start && granularity)) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body' })
// // 	};

// // 	try {
// // 		const abandonedCheckouts = await storeController.fetchStoreAbandonedCheckouts({ storeId: store, start, end });
// // 		return res.json(getMetrics(abandonedCheckouts, granularity));
// // 	} catch (error) {
// // 		return res.status(500).json({ success: false, error: 'Internal Server Error' });
// // 	}
// // });

// // router.post('/shopify/most-wanted', auth, async (req, res) => {
// // 	const { store } = req.body;
// // 	if (!store) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body' })
// // 	};

// // 	try {
// // 		const products = await storeController.fetchBestSellingProducts(store);
// // 		res.json(products);
// // 	} catch (error) {
// // 		return res.status(500).json({ success: false, error: 'Internal Server Error' });
// // 	};
// // });

// // router.get('/shopify/products', auth, storeExists, async (req, res) => {
// // 	const { store } = req.query;

// // 	if (!store) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body, missing store' })
// // 	};

// // 	try {
// // 		const products = await storeController.getAllProducts(store);
// // 		return res.json(products);
// // 	} catch (error) {
// // 		logger.error(error);
// // 		return res.status(500).json({ success: false, message: JSON.stringify(error) });
// // 	}
// // });

// // router.get('/shopify/product', auth, async (req, res) => {
// // 	const { store, productId } = req.query;
// // 	if (!store || !productId) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body' })
// // 	};

// // 	try {
// // 		const product = await storeController.getProduct(store, productId);
// // 		if (product) {
// // 			return res.json(product);
// // 		} else {
// // 			return res.sendStatus(404);
// // 		}
// // 	} catch (error) {
// // 		return res.status(500).json({ success: false, message: JSON.stringify(error) });
// // 	}
// // });

// // router.post('/shopify/product-orders', auth, storeExists, async (req, res) => {
// // 	const { store, productId, start, end } = req.body;

// // 	if (!store || !productId || !start || !end) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body' })
// // 	};

// // 	try {
// // 		let orderData;
// // 		orderData = await storeController.fetchOrdersByProductId(store, productId, start, end);
// // 		return res.json(orderData);
// // 	} catch (error) {
// // 		logger.error(error);
// // 		return res.status(500).json({ success: false, message: JSON.stringify(error) });
// // 	}
// // });

// // router.post('/shopify/import-products', auth, storeExists, async (req, res) => {
// // 	const { store } = req.body;
// // 	if (!store) {
// // 		return res.status(400).json({ success: false, message: 'Invalid request body, missing store' })
// // 	};

// // 	try {
// // 		await storeController.submitBulkProductVariantsQuery(store);
// // 		return res.sendStatus(200);
// // 	} catch (error) {
// // 		logger.error(error);
// // 		return res.status(500).json({ success: false, message: JSON.stringify(error) });
// // 	}
// // });

// // router.post('/shopify/webhooks/products-bulk-read', async (req, res) => {
// // 	try {
// // 		const {
// // 			admin_graphql_api_id,
// // 			completed_at,
// // 			created_at,
// // 			error_code,
// // 			status,
// // 			type
// // 		} = req.body;
// // 		const storeId = req.headers['x-shopify-shop-domain'];

// // 		let products = await storeController.readProductVariantsFromJSONL(storeId, admin_graphql_api_id);
// // 		products = products.map(product => {
// // 			let productJSON = JSON.parse(product);
// // 			const productId = Number(String(productJSON.id).split("/").slice(-1)[0]);
// // 			return [productId, product];
// // 		});

// // 		await storeController.createAllProducts(storeId, products);
// // 		res.sendStatus(200);
// // 	} catch (error) {
// // 		res.status(500);
// // 		logger.error(error);
// // 	}
// // });

// // router.post('/shopify/webhooks/product', async (req, res) => {
// // 	try {
// // 		const {
// // 			admin_graphql_api_id,
// // 			completed_at,
// // 			created_at,
// // 			error_code,
// // 			status,
// // 			type,
// // 			id: productId
// // 		} = req.body;

// // 		const topic = req.headers['x-shopify-topic'];
// // 		const storeId = req.headers['x-shopify-shop-domain'];
// // 		const webhookId = req.headers['x-shopify-webhook-id']; //TODO: queue this, stop double executing...

// // 		const productData = req.body;

// // 		switch (topic) {
// // 			case 'products/create':
// // 				await storeController.createProduct(storeId, productData);
// // 				break;

// // 			case 'products/update':
// // 				const products = await storeController.getAllProducts(storeId);
// // 				const outdatedProduct = products.find(product => {
// // 					const parsedProductId = Number(String(product.id).split("/").slice(-1)[0]);
// // 					return parsedProductId === productData.id;
// // 				});

// // 				const updatedProduct = await storeController.fetchProduct(storeId, outdatedProduct.id);
// // 				await storeController.updateProduct(storeId, updatedProduct);
// // 				break;

// // 			case 'products/delete':
// // 				await storeController.deleteProduct(storeId, productData.id);
// // 				break;

// // 			default:
// // 				logger.warn(`Unhandled webhook topic '${topic}' for store '${storeId}'`);
// // 				return res.sendStatus(400);
// // 		}

// // 		res.sendStatus(200);
// // 	} catch (error) {
// // 		logger.error(error);
// // 		res.status(500).json({ error: 'Internal Server Error' });
// // 	}
// // });

// module.exports = router;
