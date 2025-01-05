import express, { Application, json, urlencoded } from "express";
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import http, { Server } from 'http';
import Socket from './sockets/index';
import ResourceController from "./controllers/resource";
import RedisService from './clients/redis';
import { errorHandler } from './middleware/auth';
import logger from './utils/logger';


export default class App {
	public app: Application;
	public port: Number;
	public environment: String;
	public server: Server;
	public socket: Socket;
	public controllers: ResourceController[];

	constructor(controllers: ResourceController[], configuration: any) {
		this.app = express();
		this.port = configuration.port;
		this.environment = configuration.environment;
		this.server = http.createServer(this.app);
		this.socket = new Socket(this.server);
		this.controllers = controllers;

		this.initializeMiddlewares();
		this.initializeControllers(controllers);
		this.initializeErrorHandling();
	}

	private initializeMiddlewares() {
		// App encoding config
		this.app.use(json());
		this.app.use(urlencoded({ extended: true }));

		// Redis session middleware
		this.app.use(session({
			store: new RedisService().redisStore,
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

	private initializeErrorHandling() {
		this.app.use(errorHandler);
	}

	private initializeControllers(controllers: ResourceController[]) {
		controllers.forEach((controller) => {
			logger.info(`Registering controller for resource: ${controller.path}`);
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
			logger.info('App listening on port %d', this.port);
			// connect();
		});
	}
}
