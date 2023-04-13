const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { ShopSchema } = require('./Shop');

const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	google_access_token: String,
	google_refresh_token: String,
	facebook_access_token: String,
	facebook_manager_id: String,
	shops: [ShopSchema]
}, { strict: false });

UserSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', UserSchema);

module.exports = { User, UserSchema };
