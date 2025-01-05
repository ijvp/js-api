const logger = require('../utils/logger');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

const verifyWebhook = (req, res, next) => {
	const hmacHeader = req.get('X-Shopify-Hmac-SHA256');

	const hmacDigest = CryptoJS.HmacSHA256(req.rawBody, process.env.SHOPIFY_API_SECRET).toString(CryptoJS.enc.Base64);

	if (crypto.timingSafeEqual(Buffer.from(hmacDigest), Buffer.from(hmacHeader))) {
		next();
	} else {
		res.status(401).json({ success: false, error: 'Webhook verification failed' });
	}
};

module.exports = { verifyWebhook };