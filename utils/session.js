const logIn = async (req, userId) => {
	req.session.userId = userId;
	await req.session.save(err => {
		if (err) throw err;
	});
};

const logOut = (req, res) => {
	new Promise((resolve, reject) => {
		req.session.destroy(err => {
			if (err) reject(err);
			resolve();
		});
	});
};

const isLoggedIn = (req) => !!req.session.userId;

module.exports = { logIn, logOut, isLoggedIn };