const mongoose = require('mongoose');
const { FacebookBusinessSchema } = require('./FacebookBusiness');
const { GoogleCampaignSchema } = require('./GoogleCampaign');
const { GoogleClientSchema } = require('./GoogleClient');

const ShopSchema = new mongoose.Schema({
	name: String,
	shopify_access_token: String,
	google_access_token: String,
	google_refresh_token: String,
	facebook_access_token: String,
	facebook_refresh_token: String,
	google_client: GoogleClientSchema,
	facebook_business: FacebookBusinessSchema
}, { strict: false });

const Shop = mongoose.model('Shop', ShopSchema);
module.exports = { Shop, ShopSchema };
