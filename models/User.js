const mongoose = require('mongoose');
const { ShopSchema } = require('./Shop');
const { decrypt } = require('../utils/crypto');

const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	shops: [ShopSchema]
}, { strict: false });

// UserSchema.plugin(passportLocalMongoose);

UserSchema.methods.matchesPassword = function (password) {
	return password === decrypt(this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = { User, UserSchema };
