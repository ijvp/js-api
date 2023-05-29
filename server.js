require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const connect = require('./utils/connect');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const shopifyRoutes = require('./routes/shopify');
const googleRoutes = require('./routes/google');
const facebookRoutes = require('./routes/facebook');

const port = process.env.PORT || 8080;
const app = express();

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

// Session middleware
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		domain: process.env.NODE_ENV === 'production' ? 'turbopartners.com.br' : "",
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
	}
}));

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

// Tell express to allow nginx address directly next to app
// which points to the aws production load balancer
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);

app.listen(port, () => {
	logger.info('Server running on port %d', port);
	connect();
});
