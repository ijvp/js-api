//helper function that returns safe user object without sensitive info
const getCurrentUser = (unsafeUser) => {
	const { _id, username } = unsafeUser;
	const shops = unsafeUser.shops.map(shop => ({
		id: shop.id,
		name: shop.name,
		google_campaigns: shop.google_campaigns,
		google_client: shop.google_client,
		facebook_business: shop.facebook_business
	}));

	return { _id, username, shops, googleConnected: !!unsafeUser.google_refresh_token, facebookConnected: !!unsafeUser.facebook_access_token };
}

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

module.exports = { getCurrentUser, logIn, logOut, isLoggedIn };