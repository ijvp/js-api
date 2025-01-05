import Decimal from 'decimal.js';
import shopify from "../clients/shopify";
import redis from '../clients/redis';
import logger from './logger';
import RedisService from '../clients/redis';

export const getMetrics = (items, granularity) => {
	const metrics = new Map();

	if (items.length) {
		for (const item of items) {
			const date = granularity === 'day' ? item.created_at.substring(0, 10) : item.created_at.substring(0, 13);

			if (!metrics.has(date)) {
				metrics.set(date, { date, count: 1, value: parseFloat(new Decimal(item.total_price).toString()) });
			} else {
				const metric = metrics.get(date);
				metric.count += 1;
				metric.value = parseFloat(Decimal.add(metric.value, item.total_price).toString());
				metrics.set(date, metric);
			}
		}
	}

	return Array.from(metrics.values());
};

export const getStoreAccessToken = (req, platform) => {
	const { store } = req.body;
	const selectedPlatform = platform + '_access_token';
	return req.user.shops.find(shop => shop.name == store)[selectedPlatform];
};

export const getStoreApiURL = (store) => {
	return `https://${store}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
};

export const getStoreFrontApiURL = (store) => {
	return `https://${store}/api/${process.env.SHOPIFY_API_VERSION}`;
};

// passar propriedade "timezone" do recurso "shop"
// exemplo: "(GMT-03:00) America/Sao_Paulo"
// https://shopify.dev/docs/api/admin-rest/2023-07/resources/shop
export const extractTimezoneOffset = (timezoneString) => {
	const offsetPattern = /([+-]\d{2}:\d{2})/;
	const match = timezoneString.match(offsetPattern);
	if (match) {
		return match[1];
	} else {
		return "Unknown";
	}
};

//sempre retorna a proxima pagina do header da shopify, se nao retorna nulo
//é possivel que precise refatorar isso depois caso rel="previous" torne se
//util
export const extractHttpsUrl = (linkHeader) => {
	if (linkHeader) {
		const links = linkHeader.split(',');

		for (const link of links) {
			let [url, rel] = link.split(';');

			if (rel) {
				rel = rel.match(/rel="(.*)"/)[1];
				if (rel == "next") {
					url = url.trim().slice(1, -1);
					return url;
				}
			} else {
				return false;
			}
		}
	}

	return false;
};

export const arrayToObject = (arr) => {
	const result = {};
	for (const [key, value] of arr) {
		result[key] = value;
	}

	return result;
};

// export const getSessionFromStorage = async (redisClient: RedisService, sessionId: String) => {
// 	try {
// 		const session = await redisClient.redisClient.get(`${shopify.config.sessionStorage.options.sessionKeyPrefix}_offline_${sessionId}`);
// 		return arrayToObject(JSON.parse(session));
// 	} catch (error) {
// 		logger.error(error);
// 		throw new Error("Failed to get session from storage");
// 	};
// };
