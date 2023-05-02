const router = require('express').Router();
const passport = require('passport');
const { decrypt } = require('../utils/crypto');
const getCurrentUser = require('../utils/currentUser');
const { User } = require('../models/User');

passport.use(User.createStrategy());

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
	User.findById(id, (err, user) => done(err, user));
});

//register user
router.post('/auth/register', (req, res) => {
	User.register({ username: req.body.username }, req.body.password)
		.then(user => {
			passport.authenticate('local')(req, res, () => {
				res.status(200).json({ success: true, username: user.username });
			})
		})
		.catch(error => {
			res.status(500).json({ success: false, message: error.message });
		})
});

//login user
router.post('/auth/login', (req, res) => {
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, err => {
		if (err) {
			console.log(err);
		} else {
			passport.authenticate('local', { failureRedirect: '/login' })(req, res, () => {
				// res.redirect('/')
				const shopifyRedirect = res.req.user.shops.length === 0;
				const user = getCurrentUser(req.user);
				res.status(200).json({ success: true, shopifyRedirect: shopifyRedirect, user });
			})
		}
	});
});

//logout user
router.get('/auth/logout', (req, res, next) => {
	req.logout(err => {
		if (err) {
			return next(err);
		}
		res.clearCookie('connect.sid');
		res.json({ success: true, message: 'logged out' })
		res.end();
	});
});

router.get('/auth/me', (req, res) => {
	if (req.user) {
		res.status(200).json(getCurrentUser(req.user));
	} else {
		res.status(401).json({ success: false, error: 'Not logged in' });
	}
});

module.exports = router;
