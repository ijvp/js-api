const checkAuth = (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ success: false, message: 'Not logged in' });
	}

	next();
};

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

module.exports = { checkAuth, getCurrentUser };