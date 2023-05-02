const mongoose = require('mongoose');
const logger = require('./logger');

const connect = () => {
	mongoose.set('strictQuery', true); //warning suppression
	mongoose.connect(process.env.DB_CONNECT)
		.then(() => logger.info("Connected to database"))
		.catch(error => { logger.error(error); process.exit(1) });
};

module.exports = connect;
