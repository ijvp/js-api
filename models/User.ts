import mongoose from 'mongoose';
import { decrypt } from '../utils/crypto.js';

const { Schema } = mongoose;

class UserClass {
	matchesPassword(password) {
		return password === decrypt(this.password);
	}
}

const UserSchema = new Schema({
	username: { type: String, required: true },
	password: String,
}, { strict: false });

UserSchema.loadClass(UserClass);

const User = mongoose.model('User', UserSchema);

export { User, UserSchema };
