import express, { Application, json, urlencoded } from "express";
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import http, { Server } from 'http';
import Socket from './sockets/index';
import ResourceController from "./controllers/resource";
import RedisService from './services/redis';
import { errorHandler } from './middleware/auth';
import logger from './utils/logger';
import { AppConfiguration } from "./ts/interfaces/app";


export default class App {
	public app: Application;
	public port: Number;
	public environment: String;
	public server: Server;
	public socket: Socket;
	public controllers: ResourceController[];
	public cache: RedisService;

	constructor(controllers: ResourceController[], configuration: AppConfiguration) {
		this.app = express();
		this.port = configuration.port;
		this.environment = configuration.environment;
		this.server = http.createServer(this.app);
		this.socket = new Socket(this.server);
		this.controllers = controllers;
		this.cache = new RedisService();

		this.initializeMiddlewares();
		this.initializeControllers(controllers);
		this.initializeErrorHandling();
	}

	private initializeMiddlewares() {
		this.configureAppEncoding();
		this.configureAppSessions();
		this.configureCors();
		this.configureProxy();
	}

	private initializeControllers(controllers: ResourceController[]) {
		controllers.forEach((controller) => {
			logger.info('Registering %s for resource %s\nPaths:\n%s',
				controller.constructor.name,
				controller.path,
				controller.router.stack.map(r => ' -- ' + r.route!.path).join('\n')
			);
			this.app.use(controller.path, controller.router);
		});
	}

	private initializeErrorHandling() {
		this.app.use(errorHandler);
	}

	private configureAppEncoding() {
		this.app.use(json());
		this.app.use(urlencoded({ extended: true }));
	}

	private configureAppSessions() {
		logger.info('Configuring app sessions using %s store', Object(this.cache).constructor.name);
		this.app.use(session({
			store: this.cache.getRedisStore(),
			secret: process.env.SESSION_SECRET || 'default_secret',
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: false,
				httpOnly: true,
				maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
			}
		}));

		// Passport middleware
		this.app.use(passport.initialize());
		this.app.use(passport.session());
	}

	private configureCors() {
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
	}

	private configureProxy() {
		logger.info('Configuring proxy: nginx %s', this.environment === 'production' ? 'enabled' : 'disabled');
		// Tell express to allow nginx address directly next to app
		// which points to the aws production load balancer
		if (this.environment === 'production') {
			this.app.set('trust proxy', true);
		}
	}

	public listen() {
		this.app.listen(this.port, () => {
			logger.info('App listening on port %s', this.port);
			// connect();
		});
	}
}
