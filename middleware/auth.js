const { isLoggedIn } = require("../utils/session")

const guest = (req, res, next) => {
	if (isLoggedIn(req)) {
		return next(new Error('Already logged in'))
	}

	next()
}

const auth = (req, res, next) => {
	if (!isLoggedIn(req)) {
		return next(new Error('You must be logged in'))
	}

	next()
}

module.exports = { guest, auth }