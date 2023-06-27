const Redis = require('ioredis');
const RedisStore = require('connect-redis').default;
const logger = require('../utils/logger');

let redisClient;

if (process.env.NODE_ENV === 'development') {
	redisClient = new Redis({
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT
	});
} else {
	const nodes = [{
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT
	}];

	const options = {
		redisOptions: {
			tls: {
				checkServerIdentity: (servername, cert) => { return undefined }
			}
		}
	}

	redisClient = new Redis.Cluster(nodes, options);
}

redisClient.on('connecting', () => logger.info('Redis client connecting...'));
redisClient.on('reconnecting', () => logger.info('Redis client reconnecting...'))
redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('ready', () => logger.info('Redis client is ready'));
redisClient.on('message', (msg) => logger.info('Redis client message: %s', msg));
redisClient.on('error', (error) => logger.error('Redis client error: %s', error));

const redisStore = new RedisStore({
	client: redisClient,
	prefix: 'sessions:'
});

module.exports = { redisClient, redisStore };