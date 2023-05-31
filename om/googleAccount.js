import { Entity, Schema } from 'redis-om';
import client from './redisClient';

class GoogleAccount extends Entity { };

const googleAccountSchema = new Schema(GoogleAccount, {
	store_id: { type: 'string' },
	account_id: { type: 'string' },
	account_name: { type: 'string' }
});

export const googleAccountRepository = client.fetchRepository(googleAccountSchema);

await googleAccountRepository.createIndex();