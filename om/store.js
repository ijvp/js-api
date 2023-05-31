import { Entity, Schema } from 'redis-om';
import client from './client';

class Store extends Entity { };

const storeSchema = new Schema(Store, {
	user_id: { type: 'string' },
	name: { type: 'string' },
	created_at: { type: 'date' },
	updated_at: { type: 'date' }
});

export const storeRepository = client.fetchRepository(storeSchema);

await storeRepository.createIndex();