const Redis = require('ioredis');
const RedisStore = require('connect-redis').default;
const logger = require('../utils/logger');

const redisClient = new Redis({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT
})

redisClient.on('connecting', () => logger.info('Redis client connecting...'));
redisClient.on('reconnecting', () => logger.info('Redis client reconnecting...'))
redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('message', logger.info);
redisClient.on('error', logger.error);

const redisStore = new RedisStore({
	client: redisClient,
	prefix: 'sessions:'
});

module.exports = { redisClient, redisStore };
