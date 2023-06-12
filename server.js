// packages
require('dotenv').config();
require('@shopify/shopify-api/adapters/node');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');

//modules
const { redisStore } = require('./om/redisClient');

// routes
const authRoutes = require('./routes/auth');
const shopifyRoutes = require('./routes/shopify');
const googleRoutes = require('./routes/google');
const facebookRoutes = require('./routes/facebook');
const userRoutes = require('./routes/user');

// utils
const connect = require('./utils/connect');
const logger = require('./utils/logger');

const port = process.env.PORT || 8080;
const app = express();

// Tell express to allow nginx address directly next to app
// which points to the aws production load balancer
if (process.env.NODE_ENV !== 'development') {
	logger.info(`Configuring nginx proxy for env:${process.env.NODE_ENV}`);
	app.set('trust proxy', 1);
};

// Redis session middleware
app.use(session({
	store: redisStore,
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		domain: process.env.NODE_ENV !== 'development' ? 'turbopartners.com.br' : "",
		secure: process.env.NODE_ENV !== 'development',
		sameSite: process.env.NODE_ENV !== 'development' ? 'none' : 'lax'
	},
	proxy: process.env.NODE_ENV !== 'development'
}));

// CORS middleware
const whitelist = [
	process.env.FRONTEND_URL
];
const corsOptions = {
	credentials: true,
	origin: function (origin, callback) {
		//TODO: test this line and other corsOption.req middleware
		const forwardedHost = (corsOptions.req && corsOptions.req.headers["x-forwarded-host"]) || "";
		if (forwardedHost === process.env.FRONTEND_URL) {
			callback(null, true);
		}
		//Postman bypass for local development since it has no origin
		else if (!origin) {
			callback(null, true);
		}
		else if (whitelist.indexOf(origin) !== -1) {
			callback(null, true)
		} else {
			callback(new Error('Not allowed by CORS', origin))
		}
	}
};
app.use((req, res, next) => {
	corsOptions.req = req;
	next();
});
app.use(cors(corsOptions));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// App encoding config
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// App routes config
app.use('/', authRoutes);
app.use('/', shopifyRoutes);
app.use('/', googleRoutes);
app.use('/', facebookRoutes);
app.use('/', userRoutes);

app.listen(port, () => {
	logger.info('NODE ENV: %d', process.env.NODE_ENV);
	logger.info('Server running on port %d', port);
	connect();
});


