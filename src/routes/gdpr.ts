import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import redisClient from '../clients/redis';
import ShopController from '../controllers/shop';
// import { verifyWebhook } from '../middleware/webhook';

const router = Router();
const storeController = new ShopController();

//TODO: Reimplement and use verifyWebhook middleware
router.post('/gdpr/customer/data-request', (req: Request, res: Response) => {
	const {
		shop_id,
		shop_domain,
		orders_requested,
		customer,
		data_request
	} = req.body;

	try {
		logger.info(`GDPR Webhook 'customer/data-request' received for shop '${shop_domain}', customer '${customer.id}/${customer.email}'`);
		//TODO: delete store from any user_stores set since no req.session.userId
		// will be present in webhook;
		res.status(200).json({ success: true, message: 'Data request received' });
	} catch (error) {
		logger.error("GDPR Webhook 'customer/data-request' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

router.post('/gdpr/customer/redact', (req: Request, res: Response) => {
	const {
		shop_id,
		shop_domain,
		customer,
		orders_to_redact
	} = req.body;

	try {
		logger.info("GDPR Webhook 'customer/redact' received");
		//TODO: OK for now, orders data not persisted, just read from API and forwarded
		res.status(200).json({ success: true, message: `Customer data redacted` });
	} catch (error) {
		logger.error("GDPR Webhook 'customer/redact' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

router.post('/gdpr/shop/redact', async (req: Request, res: Response) => {
	const {
		shop_id,
		shop_domain
	} = req.body;

	try {
		logger.info("GDPR Webhook 'shop/redact' received");
		// await storeController.deleteStoreData(shop_domain);
		//TODO: delete store from any user_stores set since no req.session.userId
		// will be present in webhook;
		res.status(200).json({ success: true, message: `Shop '${shop_domain}' data redacted` });
	} catch (error) {
		logger.error("GDPR Webhook 'shop/redact' failed: %s", error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

export default router;
