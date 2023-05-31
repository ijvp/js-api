import { Entity, Schema } from 'redis-om';
import client from './client';

class User extends Entity { };

const userSchema = new Schema(User, {
	username: { type: 'string' },
	password: { type: 'string' }
});

export const userRepository = client.fetchRepository(userSchema);

await userRepository.createIndex();