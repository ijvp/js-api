import { Redis, Cluster, ClusterNode, ClusterOptions } from "ioredis";
import logger from "../utils/logger";
import RedisStore from "connect-redis";


export default class RedisService {
	private readonly redisClient: Redis;
	private readonly redisStore: RedisStore;

	public readonly clusterOptions: ClusterOptions = {
		enableReadyCheck: true,
		redisOptions: {
			//CERT_ALTNAME_INVALID error workaround, ioredis tls issue
			tls: {
				checkServerIdentity: (servername, cert) => { return undefined }
			}
		}

	}

	constructor() {
		// const node: ClusterNode = {
		// 	host: process.env.REDIS_HOST,
		// 	port: Number.parseInt(process.env.REDIS_PORT || "6379")
		// }

		// this.redisClient = new Cluster([node], this.clusterOptions);

		this.redisClient = new Redis(
			{
				host: process.env.REDIS_HOST,
				port: Number.parseInt(process.env.REDIS_PORT || "6379")
			}
		);

		this.redisStore = new RedisStore({
			client: this.redisClient,
			prefix: 'sessions:'
		});

		this.configureClientLogs();
	}

	private configureClientLogs() {
		this.redisClient.on('connecting', () => logger.info('Redis client connecting...'));
		this.redisClient.on('reconnecting', () => logger.info('Redis client reconnecting...'))
		this.redisClient.on('connect', () => logger.info('Redis client connected'));
		this.redisClient.on('ready', () => logger.info('Redis client is ready'));
		this.redisClient.on('message', (msg) => logger.info('%s: %s', this.constructor.name, msg));
		this.redisClient.on('error', (error) => logger.error('%s: %s', this.constructor.name, error));
	}

	public getRedisClient(): Redis {
		return this.redisClient;
	}

	public getRedisStore(): RedisStore {
		return this.redisStore;
	}
}
// const Redis = require('ioredis');
// const RedisStore = require('connect-redis').default;
// const logger = require('../utils/logger');

// let redisClient;

// if (process.env.NODE_ENV === 'development') {
// 	redisClient = new Redis({
// 		host: process.env.REDIS_HOST,
// 		port: process.env.REDIS_PORT
// 	});
// } else {
// 	const nodes = [{
// 		host: process.env.REDIS_HOST,
// 		port: process.env.REDIS_PORT
// 	}];

// 	const options = {
// 		clusterRetryStrategy: new clu
// 		redisOptions: {
// 			tls: {
// 				checkServerIdentity: (servername, cert) => { return undefined }
// 			}
// 		},

// 	}

// 	redisClient = new Redis.Cluster(nodes, options);
// }

// redisClient.on('connecting', () => logger.info('Redis client connecting...'));
// redisClient.on('reconnecting', () => logger.info('Redis client reconnecting...'))
// redisClient.on('connect', () => logger.info('Redis client connected'));
// redisClient.on('ready', () => logger.info('Redis client is ready'));
// redisClient.on('message', (msg) => logger.info('Redis client message: %s', msg));
// redisClient.on('error', (error) => logger.error('Redis client error: %s', error));

// const redisStore = new RedisStore({
// 	client: redisClient,
// 	prefix: 'sessions:'
// });

// module.exports = redisClient, redisStore;