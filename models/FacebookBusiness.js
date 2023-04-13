const mongoose = require('mongoose');

const FacebookBusinessSchema = new mongoose.Schema({
	business_id: String,
	business_name: String,
})

const FacebookBusiness = mongoose.model('FacebookBusiness', FacebookBusinessSchema);

module.exports = { FacebookBusiness, FacebookBusinessSchema };