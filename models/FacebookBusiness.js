const mongoose = require('mongoose');

const FacebookBusinessSchema = new mongoose.Schema({
	id: String,
	name: String,
})

const FacebookBusiness = mongoose.model('FacebookBusiness', FacebookBusinessSchema);

module.exports = { FacebookBusiness, FacebookBusinessSchema };