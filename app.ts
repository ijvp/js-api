// packages
import dotenv from 'dotenv';
dotenv.config();

import '@shopify/shopify-api/adapters/node';
import express, { Application } from "express";
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import http, { Server } from 'http';
import Socket from './sockets';

// modules
import RedisService from './clients/redis';

// middleware
import { errorHandler } from './middleware/auth';

// utils
// import connect from './utils/connect';
import logger from './utils/logger';

export default class App {
	public app: Application;
	public port: Number;
	public environment: String;
	public server: Server;
	public socket: Socket;

	constructor(controllers, configuration) {
		this.app = express();
		this.port = configuration.port;
		this.environment = configuration.environment;

		this.server = http.createServer(this.app);
		this.socket = new Socket(this.server);

		this.initializeMiddlewares();
		this.initializeControllers(controllers);
		this.initializeErrorHandling();
	}

	private initializeMiddlewares() {
		// App encoding config
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));

		// Redis session middleware
		// this.app.use(session({
		// 	store: new RedisService().redisStore,
		// 	secret: process.env.SESSION_SECRET,
		// 	resave: false,
		// 	saveUninitialized: false,
		// 	cookie: {
		// 		domain: process.env.NODE_ENV !== 'development' ? 'turbopartners.com.br' : "",
		// 		secure: process.env.NODE_ENV !== 'development',
		// 		sameSite: process.env.NODE_ENV !== 'development' ? 'none' : 'lax'
		// 	}
		// }));

		// CORS middleware
		// const whitelist = [
		// 	process.env.FRONTEND_URL
		// ];

		// const corsOptions: cors.CorsOptions = {
		// 	credentials: true,
		// 	origin: function (origin, callback) {
		// 		//TODO: test this line and other corsOption.req middleware
		// 		//Postman bypass for local development since it has no origin
		// 		if (!origin) {
		// 			callback(null, true);
		// 		}
		// 		else if (whitelist.indexOf(origin) !== -1) {
		// 			callback(null, true)
		// 		} else {
		// 			callback(new Error(`Not allowed by CORS: ${origin}`))
		// 		}
		// 	}
		// };

		// app.use((req, res, next) => {
		// 	corsOptions.req = req;
		// 	next();
		// });

		// this.app.use(cors(corsOptions));

		// Passport middleware
		// this.app.use(passport.initialize());
		// this.app.use(passport.session());

		// App routes config
		// this.app.get('/health', (request: Response, res: Response) => {
		// 	logger.info('Health check from request: %s', request);
		// 	return res.status(200).json({
		// 		"online": true
		// 	});
		// })
	}

	private initializeErrorHandling() {
		this.app.use(errorHandler);
	}

	private initializeControllers(controllers) {
		controllers.forEach((controller) => {
			this.app.use(controller.path, controller.router);
		});
	}

	// Tell express to allow nginx address directly next to app
	// which points to the aws production load balancer
	// if(process.env.NODE_ENV !== 'development') {
	// 	logger.info(`Configuring nginx proxy for env:${process.env.NODE_ENV}`);
	// 	app.set('trust proxy', true);
	// }

	public listen() {
		this.app.listen(this.port, () => {
			logger.info('NODE ENV: %s', this.environment);
			logger.info('App listening on port %d', this.port);
			// connect();
		});
	}
}
