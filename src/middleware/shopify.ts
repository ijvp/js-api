import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';
import crypto from 'crypto';

// export const shopExists = async (req, res, next) => {
// 	const shop = req.method === 'POST' ? req.body.shop : req.query.shop;

// 	try {
// 		const result = await redisClient.sismember(`user_stores:${req.session.userId}`, shop);
// 		if (!result) {
// 			return next(new Error('Store not found'));
// 		}
// 		next();
// 	} catch (err) {
// 		logger.error(`Error checking store existence: ${err}`);
// 		return next(new Error('Internal Server Error'));
// 	}
// };

export const verifyHMAC = (req: Request, res: Response, next: NextFunction) => {
	const { hmac, ...queryParams } = req.query;

	const sortedQueryString = Object.keys(queryParams)
		.sort()
		.map(key => `${key}=${queryParams[key]}`)
		.join('&');

	const generatedHmac = crypto
		.createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
		.update(sortedQueryString)
		.digest('hex');

	if (generatedHmac !== hmac) {
		next(new Error('HMAC validation failed'));
	}

	logger.info('HMAC validation passed');
	next();
}