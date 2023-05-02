const mongoose = require('mongoose');

const connect = () => {
	mongoose.set('strictQuery', true); //warning suppression
	mongoose.connect(process.env.DB_CONNECT)
		.then(() => console.log("Connected to database"))
		.catch(error => { console.log(error); process.exit(1) });
};

module.exports = connect;
