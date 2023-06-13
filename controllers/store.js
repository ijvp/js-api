class StoreController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async getStoresByUserId(userId) {
		const storeIds = await this.redisClient.smembers(`user_stores:${userId}`);
		const stores = [];

		for (const storeId of storeIds) {
			const store = await this.redisClient.hgetall(`stores:${storeId}`);
			stores.push(store);
		}

		return stores;
	};

	async getStoreConnectionsByStoreId(storeId) {
		const connections = {
			facebook_account: false,
			google_account: false,
		};

		const facebookAccountExists = await this.redisClient.exists(
			`facebook_account:${storeId}`
		);
		const googleAccountExists = await this.redisClient.exists(
			`google_account:${storeId}`
		);

		if (facebookAccountExists) {
			connections.facebook_account = true;
		}

		if (googleAccountExists) {
			connections.google_account = true;
		}

		return connections;
	};
};
