const { isLoggedIn } = require("../utils/session");
const logger = require('../utils/logger');

class UnauthenticatedError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UnauthenticatedError';
		this.statusCode = 401;
	}
}

const guest = (req, res, next) => {
	if (isLoggedIn(req)) {
		return next(new Error('Already logged in'))
	}

	next();
};

const auth = (req, res, next) => {
	if (!isLoggedIn(req)) {
		logger.info(`Unauthenticated request at '${req.path}'`);
		return next(new UnauthenticatedError(`Unauthenticated`));
	}

	next();
};

const errorHandler = (err, req, res, next) => {
	if (err instanceof UnauthenticatedError) {
		res.status(err.statusCode).json({ error: err.message });
	}
};

module.exports = { guest, auth, errorHandler };