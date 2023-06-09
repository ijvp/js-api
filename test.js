router.post('/auth/login', (req, res) => {
	const { username, password } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ success: false, message: 'Invalid request body' });
	}

	const user = new User({
		username,
		password
	});
	try {
		req.login(user, err => {
			if (err) {
				console.log("AUTH ERR", err)
				// logger.error(err);
				res.status(500).json({ success: false, message: 'Internal server error' });
			} else {
				console.log("ATTEMTPING PASSPORT AUTH CALL", user)
				passport.authenticate('local')(req, res, () => {
					const shopifyRedirect = res.req.user.shops.length === 0;
					const user = getCurrentUser(req.user);
					res.status(200).json({ success: true, shopifyRedirect: shopifyRedirect, user });
				})
			}
		});
	} catch (error) {
		console.log("CAUGHT ERROR", error)
		// logger.error(error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}

});