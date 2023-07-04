const logIn = async (req, userId) => {
	req.session.userId = userId;
	req.session.save();
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