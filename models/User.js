const mongoose = require('mongoose');
const { decrypt } = require('../utils/crypto');

const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
}, { strict: false });

UserSchema.methods.matchesPassword = function (password) {
	return password === decrypt(this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = { User, UserSchema };
