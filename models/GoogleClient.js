const mongoose = require('mongoose');

const GoogleClientSchema = new mongoose.Schema({
	id: String,
	name: String,
})

const GoogleClient = mongoose.model('GoogleClient', GoogleClientSchema);

module.exports = { GoogleClient, GoogleClientSchema };
