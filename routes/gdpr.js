const router = require('express').Router();
const logger = require('../utils/logger');
const { redisClient } = require('../om/redisClient');
const StoreController = require('../controllers/store');

const storeController = new StoreController(redisClient);

router.post('/gdpr/customer/data-request', (req, res) => {
	const {
		shop_id,
		shop_domain,
		orders_requested,
		customer,
		data_request
	} = req.body;

	try {
		logger.info(`GDPR Webhook 'customer/data-request' recieved for shop '${shop_domain}', customer '${customer.id}/${customer.email}'`);
		//TODO: delete store from any user_stores set since no req.session.userId
		// will be present in webhook;
		res.status(200);
	} catch (error) {
		logger.error("GDPR Webhook 'customer/data-request' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

router.post('/gdpr/customer/redact', (req, res) => {
	const {
		shop_id,
		shop_domain,
		customer,
		orders_to_redact
	} = req.body;

	try {
		logger.info("GDPR Webhook 'customer/redact' recieved");
		//TODO: OK for now, orders data not persisted, just read from API and forwarded
		res.status(200).json({ success: true, message: `Customer data redacted` })
	} catch (error) {
		logger.error("GDPR Webhook 'customer/redact' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

router.post('/gdpr/shop/redact', async (req, res) => {
	const {
		shop_id,
		shop_domain
	} = req.body;

	try {
		logger.info("GDPR Webhook 'shop/redact' recieved");
		await storeController.deleteStoreData(shop_domain);
		//TODO: delete store from any user_stores set since no req.session.userId
		// will be present in webhook;
		res.status(200).json({ success: true, message: `Shop '${shop_domain}' data redacted` });
	} catch (error) {
		logger.error("GDPR Webhook 'shop/redact' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

module.exports = router;
