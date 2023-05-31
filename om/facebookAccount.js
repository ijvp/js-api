import { Entity, Schema } from 'redis-om';
import client from './redisClient';

class FacebookAccount extends Entity { };

const facebookAccountSchema = new Schema(FacebookAccount, {
	store_id: { type: 'string' },
	account_id: { type: 'string' },
	account_name: { type: 'string' }
});

export const facebookAccountRepository = client.fetchRepository(facebookAccountSchema);

await facebookAccountRepository.createIndex();