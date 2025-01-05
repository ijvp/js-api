import mongoose from 'mongoose';
import { decrypt } from '../utils/crypto';

const { Schema } = mongoose;

class UserClass {
	password: string;

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
