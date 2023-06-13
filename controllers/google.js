class GoogleController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	}

	async getGoogleAccountByStoreId(storeId) {
		const googleAccount = await this.redisClient.hgetall(
			`google_account:${storeId}`
		);
		return googleAccount;
	}
}