const router = require('express').Router();
const logger = require('../utils/logger');
const { logIn, logOut } = require('../utils/session');
const { encrypt } = require('../utils/crypto');
const { User } = require('../models/User');
const { auth } = require('../middleware/auth');

router.post('/auth/register', async (req, res) => {
	const { username, password } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' });
	}

	const found = await User.exists({ username });
	if (found) {
		res.status(409).json({ success: false, message: "A user with the given username is already registered" });
	};

	const user = await User.create({ username, password: encrypt(password) })
	logIn(req, user.id);
	res.status(201).json({ success: true, message: `User '${user.username}' was created successfully` });
});

router.post('/auth/login', async (req, res) => {
	const { username, password } = req.body;

	try {
		const found = await User.findOne({ username });
		const passwordsMatch = await found?.matchesPassword(password);

		if (!found || !passwordsMatch) {
			return res.status(401).json({ success: false, message: 'Invalid username/password' });
		}

		await logIn(req, found.id);
		res.json({ success: true, message: "User logged in" });
	} catch (error) {
		logger.error(error);
		return res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

router.post('/auth/update', auth, async (req, res) => {
	const { username, password, newPassword } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' });
	};

	const user = await User.findById(req.session.userId);
	if (!user) {
		return res.status(404).json({ success: false, message: 'User not found' });
	}

	if (username !== user.username) {
		user.username = username;
		try {
			await user.save();
		} catch (error) {
			logger.error(error);
			return res.status(500).json({ success: false, message: 'Something went wrong' });
		};
	};

	if (newPassword) {
		if (newPassword === password) {
			return res.status(400).json({ success: false, message: 'New password cannot be the same as previous password' });
		};

		user.password = encrypt(newPassword);
		try {
			user.save();
			return res.status(200).json({ success: true, message: 'User updated successfully' });
		} catch (error) {
			logger.error(error);
			return res.status(500).json({ success: false, message: 'Internal server error' });
		};
	};
});

router.get('/auth/logout', auth, async (req, res, next) => {
	await logOut(req, res);
	res.clearCookie('connect.sid');
	res.status(200).json({ success: true, message: "User logged out" });
});

router.get('/auth/me', auth, async (req, res) => {
	const { id, username } = await User.findById(req.session.userId);
	res.status(200).json({ id, username });
});

module.exports = router;
