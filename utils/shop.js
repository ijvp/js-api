const Decimal = require('decimal.js');
const { redisClient } = require("../om/redisClient");
const shopify = require("../om/shopifyClient");
const logger = require('../utils/logger');

const getMetrics = (items, granularity) => {
	const metrics = new Map();

	if (items.length) {
		for (const item of items) {
			const date = granularity === 'day' ? item.created_at.substring(0, 10) : item.created_at.substring(0, 13);

			if (!metrics.has(date)) {
				metrics.set(date, { date, count: 1, value: parseFloat(new Decimal(item.total_price)) });
			} else {
				const metric = metrics.get(date);
				metric.count += 1;
				metric.value = parseFloat(Decimal.add(metric.value, item.total_price));
				metrics.set(date, metric);
			}
		}
	}

	return Array.from(metrics.values());
};

const getStoreAccessToken = (req, platform) => {
	const { store } = req.body;
	const selectedPlatform = platform + '_access_token';
	return req.user.shops.find(shop => shop.name == store)[selectedPlatform];
};

const getStoreApiURL = (store) => {
	return `https://${store}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
};

const getStoreFrontApiURL = (store) => {
	return `https://${store}/api/${process.env.SHOPIFY_API_VERSION}`;
};

//sempre retorna a proxima pagina do header da shopify, se nao retorna nulo
//é possivel que precise refatorar isso depois caso rel="previous" torne se
//util
const extractHttpsUrl = (linkHeader) => {
	if (linkHeader) {
		const links = linkHeader.split(' ');
		const url = links[0].slice(1, -2);
		const rel = links[1].match(/rel="(.*)"/)[1];
		if (url && rel === "next") {
			return url;
		}
	}

	return false;
};

const arrayToObject = (arr) => {
	const result = {};
	for (const [key, value] of arr) {
		result[key] = value;
	}

	return result;
};

const getSessionFromStorage = async (sessionId) => {
	try {
		const session = await redisClient.get(`${shopify.config.sessionStorage.options.sessionKeyPrefix}_offline_${sessionId}`);
		return arrayToObject(JSON.parse(session));
	} catch (error) {
		logger.error(error);
	};
};

module.exports = {
	getMetrics,
	getStoreAccessToken,
	getStoreFrontApiURL,
	getStoreApiURL,
	extractHttpsUrl,
	getSessionFromStorage
};
