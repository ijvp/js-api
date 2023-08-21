const Decimal = require('decimal.js');
const { shopify, redis } = require("../clients");
const logger = require('../utils/logger');

const { redisClient } = redis;

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

// passar propriedade "timezone" do recurso "shop"
// exemplo: "(GMT-03:00) America/Sao_Paulo"
// https://shopify.dev/docs/api/admin-rest/2023-07/resources/shop
const extractTimezoneOffset = (timezoneString) => {
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
const extractHttpsUrl = (linkHeader) => {
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
		throw new Error("Failed to get session from storage");
	};
};

module.exports = {
	getMetrics,
	getStoreAccessToken,
	getStoreFrontApiURL,
	getStoreApiURL,
	extractHttpsUrl,
	extractTimezoneOffset,
	getSessionFromStorage
};
