const router = require('express').Router();
const passport = require('passport');
const { decrypt } = require('../utils/crypto');
const logger = require('../utils/logger');
const { checkAuth, getCurrentUser } = require('../utils/user');
const { User } = require('../models/User');

passport.use(User.createStrategy());

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
	User.findById(id, (err, user) => done(err, user));
});

router.post('/auth/register', (req, res) => {
	const { username, password } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' });
	}

	User.register({ username }, password)
		.then(user => {
			passport.authenticate('local')(req, res, () => {
				res.status(201).json({ success: true, username: user.username, message: "User was successfully created" });
			})
		})
		.catch(error => {
			logger.error(error);
			res.status(409).json({ success: false, message: error.message });
		})
});

router.post('/auth/login', (req, res) => {
	const { username, password } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' });
	}

	const user = new User({
		username,
		password
	});

	req.login(user, err => {
		if (err) {
			logger.error(err);
			res.status(500).json({ success: false, message: 'Internal server error' });
		} else {
			passport.authenticate('local')(req, res, () => {
				const shopifyRedirect = res.req.user.shops.length === 0;
				const user = getCurrentUser(req.user);
				res.status(200).json({ success: true, shopifyRedirect: shopifyRedirect, user });
			})
		}
	});
});

router.get('/auth/logout', checkAuth, (req, res, next) => {
	req.logout(err => {
		if (err) {
			logger.error(err);
			return res.status(500).json({ success: false, message: 'Logout failed: ' + err.message })
		}
		res.clearCookie('connect.sid');
		res.status(200).json({ success: true, message: 'logged out' })
	});
});

router.get('/auth/me', checkAuth, (req, res) => {
	res.status(200).json(getCurrentUser(req.user));
});

module.exports = router;
