class FacebookController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async getFacebookAccountByStoreId(storeId) {
		const facebookAccount = await this.redisClient.hgetall(
			`facebook_account:${storeId}`
		);
		return facebookAccount;
	};
};
