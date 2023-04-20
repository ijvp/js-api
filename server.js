require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const port = process.env.PORT || 8080;
const authRoutes = require('./routes/auth');
const shopifyRoutes = require('./routes/shopify');
const googleRoutes = require('./routes/google');
const facebookRoutes = require('./routes/facebook');

const app = express();

const whitelist = [
	process.env.FRONTEND_URL
];


const corsOptions = {
	credentials: true,
	origin: function (origin, callback) {
		//Postman bypass since it has no origin
		if (!origin) {
			return callback(null, true);
		}
		if (whitelist.indexOf(origin) !== -1) {
			callback(null, true)
		} else {
			console.log("CORS error from origin", origin, process.env.FRONTEND_URL, origin == process.env.FRONTEND_URL)
			callback(new Error('Not allowed by CORS'))
		}
	}
};

app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV !== 'development',
		sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none'
	}
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use('/', authRoutes);
app.use('/', shopifyRoutes);
app.use('/', googleRoutes);
app.use('/', facebookRoutes);

app.set('trust proxy', 1);

mongoose.set('strictQuery', true); //warning suppression
mongoose.connect(process.env.DB_CONNECT)
	.then(() => console.log("connected to database"))
	.catch(error => console.log(error));

app.listen(port, () => console.log('Server running on port %d', port));
