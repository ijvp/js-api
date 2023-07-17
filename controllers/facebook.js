const axios = require('axios');
const logger = require('../utils/logger');
const { differenceInDays, parseISO } = require('date-fns');

class FacebookController {
	constructor(redisClient) {
		this.redisClient = redisClient;
	};

	async grantFacebookAccessToStore(storeId, token) {
		try {
			await this.redisClient.hset(`store:${storeId}`, {
				facebookAccessToken: token,
			});
			logger.info(`Granted store '${storeId}' access to Facebook APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async revokeFacebookAccessFromStore(storeId) {
		try {
			await this.redisClient.hdel(`store:${storeId}`, 'facebookAccessToken');
			logger.info(`Revoked store '${storeId}' access to Facebook APIs`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchFacebookAccountList(storeId) {
		try {
			const token = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');

			let allAccounts = [];
			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me/adaccounts?fields=name%2Cid%2Caccount_id&access_token=${token}`;

			while (url) {
				const { data: accounts } = await axios.get(url);
				allAccounts = allAccounts.concat(accounts.data);
				url = accounts.paging.next;
			}

			allAccounts.sort((a, b) => {
				const nameA = a.name.toUpperCase();
				const nameB = b.name.toUpperCase();

				if (nameA < nameB) {
					return -1;
				} else if (nameA > nameB) {
					return 1;
				} else {
					return 0;
				}
			});

			return allAccounts;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async getFacebookAccountByStoreId(storeId) {
		try {
			const facebookAdsAccount = await this.redisClient.hgetall(
				`facebook_ads_account:${storeId}`
			);
			return facebookAdsAccount;
		} catch (error) {
			logger.error('Error retrieving Facebook Ads Account: %s', error);
			throw error;
		};
	};

	async createFacebookAdsAccount(account) {
		try {
			await this.redisClient.hset(`facebook_ads_account:${account.storeId}`, account);
			logger.info(`Facebook Ads account hash '${account.storeId}' persisted`);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async deleteFacebookAdsAccount(storeId) {
		try {
			await this.redisClient.del(`facebook_ads_account:${storeId}`);
			logger.info(`Facebook Ads account hash '${storeId}' deleted`);
			await this.revokeFacebookAccessFromStore(storeId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchFacebookAds(storeId, start, end) {
		try {
			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
			const actId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id')
			const businessId = actId.slice(4) //remove 'act_';

			const campaign = {
				id: 'facebook-ads.ads-metrics',
				metricsBreakdown: []
			};

			const isSingleDay = differenceInDays(parseISO(String(end)), parseISO(String(start))) === 0;
			const since = start.split("T")[0];
			const until = end.split("T")[0];

			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${actId}/insights`;
			let params = {
				time_range: { since, until },
				level: "account",
				fields: "campaign_name,adset_name,ad_name,spend,purchase_roas",
				access_token: facebookAccessToken
			};

			if (!isSingleDay) {
				params.time_increment = 1;
			} else {
				params.breakdowns = "hourly_stats_aggregated_by_advertiser_time_zone";
			};

			try {
				do {
					const response = await axios.get(url, { params: params });
					let resData = response.data.data;
					resData.forEach(data => {
						let indexHour;
						if (isSingleDay) {
							indexHour = data.hourly_stats_aggregated_by_advertiser_time_zone.slice(0, 2);
						}

						const dailyDataDate = !isSingleDay ? `${data.date_start}` : `${data.date_start}T${indexHour}`;
						let dailyData = {
							date: dailyDataDate,
							metrics: {
								spend: parseFloat(data.spend),
							}
						}
						campaign.metricsBreakdown.push(dailyData);
					})
					url = response.data.paging?.next;
				} while (url);

				return campaign;
			} catch (error) {
				logger.error(error.response.data.error.message);
				throw error;
			}
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchActiveFacebookCampaigns(storeId) {
		try {
			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
			const actId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id')

			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${actId}/campaigns`;

			const response = await axios.get(url, {
				params: {
					access_token: facebookAccessToken,
					fields: 'id,name',
					effective_status: ['ACTIVE']
				}
			});

			return response.data;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	async fetchFacebookCampaignAdSets(storeId, campaignId) {
		try {
			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
			const actId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id')
			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${campaignId}/adsets`;

			const response = await axios.get(url, {
				params: {
					access_token: facebookAccessToken,
					fields: 'id,name',
					effective_status: ['ACTIVE']
				}
			});

			return response.data;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};
};

module.exports = FacebookController;
