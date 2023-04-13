const mongoose = require('mongoose');

const GoogleClientSchema = new mongoose.Schema({
	client_id: String,
	client_name: String,
})

const GoogleClient = mongoose.model('GoogleClient', GoogleClientSchema);

module.exports = { GoogleClient, GoogleClientSchema };
