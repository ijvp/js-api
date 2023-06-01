const redis = require('redis');
const RedisStore = require('connect-redis').default;
const logger = require('../utils/logger');

// Session middleware
const redisClient = redis.createClient({
	url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.connect().catch(logger.error)
redisClient.on('error', err => logger.error(`Redis Client Error ${err}`));

const redisStore = new RedisStore({
	client: redisClient,
	prefix: 'sessions:'
});

module.exports = { redisClient, redisStore };
