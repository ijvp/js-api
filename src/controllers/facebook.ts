import { Request, Response } from 'express';
import ResourceController from "./resource";


export default class FacebookController extends ResourceController {
    constructor() {
        super('/facebook');
        this.initializeRoutes();
    }

    initializeRoutes(): void {
        this.router.get('/auth', this.login.bind(this));
        this.router.get('/auth/callback', this.callback.bind(this));
        this.router.get('/accounts', this.getAccounts.bind(this));
        this.router.post('/account/connect', this.connectAccount.bind(this));
        this.router.get('/account/disconnect', this.disconnectAccount.bind(this));
        this.router.post('/campaigns', this.getCampaigns.bind(this));
        this.router.post('/ad-sets', this.getAdSets.bind(this));
        this.router.post('/ad-expenses', this.getAdExpenses.bind(this));
        this.router.post('/ad-insights', this.getAdInsights.bind(this));
    }

    login(req: Request, res: Response) {
        //   const { store } = req.query;

        //   if (!store) {
        //     return res.status(400).json({ success: false, message: 'Invalid request query, missing store' });
        //   }

        //   return res.status(200).json(`https://www.facebook.com/${process.env.FACEBOOK_API_VERSION}/dialog/oauth?client_id=${process.env.FACEBOOK_API_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_API_REDIRECT_URL}&scope=${process.env.FACEBOOK_API_SCOPES}&state=${store}`);
    }

    callback(req: Request, res: Response) {
        //   const { code, state: shop } = req.query;

        //   try {
        //     const response = await axios.get(`https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/oauth/access_token`, {
        //       params: {
        //         redirect_uri: process.env.FACEBOOK_API_REDIRECT_URL,
        //         client_id: process.env.FACEBOOK_API_CLIENT_ID,
        //         client_secret: process.env.FACEBOOK_API_CLIENT_SECRET,
        //         code
        //       }
        //     });

        //     const clientId = await axios.get(`https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me`, {
        //       params: {
        //         fields: 'id',
        //         access_token: response.data.access_token
        //       }
        //     }).then(response => response.data.id);

        //     await facebookController.grantFacebookAccessToStore(shop, response.data.access_token);
        //     return res.redirect(`${process.env.FRONTEND_URL}/integracoes?platform=facebook&store=${shop}`);
        //   } catch (error) {
        //     logger.error(error);
        //     return res.status(500).json({ success: false, message: "Internal Server Error" });
        //   }
    }

    getAccounts(req: Request, res: Response) {
        //   try {
        //     const { store } = req.query;
        //     const accounts = await facebookController.fetchFacebookAccountList(store);
        //     return res.status(200).json(accounts);
        //   } catch (error) {
        //     return res.status(500).json({ success: false, message: 'Internal server error' });
        //   }
    }

    connectAccount(req: Request, res: Response) {
        //   const { account, store } = req.body;
        //   if (!account) {
        //     return res.status(400).json({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     await facebookController.createFacebookAdsAccount({ ...account, storeId: store });
        //     return res.status(201).json({
        //       success: true, message: `Facebook Ads account ${account.name} added to ${store}`
        //     });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: 'Internal server error' });
        //   }
    }

    disconnectAccount(req: Request, res: Response) {
        //   try {
        //     const { store } = req.query;
        //     await facebookController.deleteFacebookAdsAccount(store);
        //     return res.status(201).json({
        //       success: true, message: `Facebook Ads account disconnected from '${store}'`
        //     });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: 'Internal server error' });
        //   }
    }

    getCampaigns(req: Request, res: Response) {
        //   try {
        //     const { store } = req.body;
        //   if (!store) {
        //     return res.status(400).json({ success: false, message: 'Invalid request body' });
        //   }
        //     const campaigns = await facebookController.fetchActiveFacebookCampaigns(store);
        //     return res.status(200).json(campaigns);
        //   } catch (error) {
        //     return res.status(500).json({ success: false, message: 'Internal server error' });
        //   }
    }

    getAdSets(req: Request, res: Response) {
        //   try {
        //     const { store, campaign } = req.body;
        //     if (!store || !campaign) {
        //       return res.status(400).json({ success: false, message: 'Invalid request body' });
        //     }
        //     const adSets = await facebookController.fetchFacebookCampaignAdSets(store, campaign);
        //     return res.status(200).json(adSets);
        //   } catch (error) {
        //     return res.status(500).json({ success: false, message: 'Internal server error' });
        //   }

        //OR

        //   const { store } = req.body;

        //   if (!store) {
        //     return res.status(400).json({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     const adSets = [];
        //     const { data: campaigns } = await facebookController.fetchActiveFacebookCampaigns(store);

        //     const adSetsPromises = campaigns.map(async campaign => {
        //       const campaignAdSets = await facebookController.fetchFacebookCampaignAdSets(store, campaign.id);
        //       return { campaignId: campaign.id, campaignName: campaign.name, adSets: campaignAdSets.data };
        //     });

        //     adSets.push(...await Promise.all(adSetsPromises));

        //     return res.json(adSets);
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: "Internal server error" });
        //   }
    }

    getAdExpenses(req: Request, res: Response) {
        //   const { store, start, end, granularity } = req.body;

        //   if (!store || !start || !end) {
        //     return res.status(400).json({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     const adsMetrics = {};
        //     const timeRange = { since: start, until: end };
        //     const { allAdsMetrics: allAdsExpenses, ttl } = await facebookController.fetchFacebookAdsExpenses(store, timeRange);

        //     allAdsExpenses.forEach(adsExpenses => {
        //       adsExpenses.metricsBreakdown.forEach(metricBreakdown => {
        //         const { date, metrics } = metricBreakdown;
        //         if (date in adsMetrics) {
        //           adsMetrics[date].spend = parseFloat((adsMetrics[date].spend + parseFloat(metrics.spend)).toFixed(2));
        //         } else {
        //           adsMetrics[date] = { spend: parseFloat(metrics.spend) };
        //         }
        //       });
        //     });

        //     return res.json({ id: 'facebook-ads.ads-metrics', metricsBreakdown: Object.entries(adsMetrics).map(([date, metrics]) => ({ date, metrics })), ttl });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: "Internal server error" });
        //   }
    }

    getAdInsights(req: Request, res: Response) {
        //   const { store, adName, start, end } = req.body;

        //   if (!store) {
        //     return res.status(400).json({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     const timeRange = { since: start, until: end };
        //     const adInsights = await facebookController.fetchFacebookAdsInsights(store, adName, timeRange);
        //     return res.json(adInsights);
        //   } catch (error) {
        //     logger.error(error);
        //     return res.status(500).json({ success: false, error: "Internal server error" });
        //   }
    }
}

// const axios = require('axios');
// const logger = require('../utils/logger');
// const { differenceInDays, parseISO } = require('date-fns');

// class FacebookController {
// 	constructor(redisClient) {
// 		this.redisClient = redisClient;
// 	};

// 	async grantFacebookAccessToStore(storeId, token) {
// 		try {
// 			await this.redisClient.hset(`store:${storeId}`, {
// 				facebookAccessToken: token,
// 			});
// 			logger.info(`Granted store '${storeId}' access to Facebook APIs`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async revokeFacebookAccessFromStore(storeId) {
// 		try {
// 			await this.redisClient.hdel(`store:${storeId}`, 'facebookAccessToken');
// 			logger.info(`Revoked store '${storeId}' access to Facebook APIs`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async fetchFacebookAccountList(storeId) {
// 		try {
// 			const token = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');

// 			let allAccounts = [];
// 			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/me/adaccounts?fields=name%2Cid%2Caccount_id&access_token=${token}`;

// 			while (url) {
// 				const { data: accounts } = await axios.get(url);
// 				allAccounts = allAccounts.concat(accounts.data);
// 				url = accounts.paging.next;
// 			}

// 			allAccounts.sort((a, b) => {
// 				const nameA = a.name.toUpperCase();
// 				const nameB = b.name.toUpperCase();

// 				if (nameA < nameB) {
// 					return -1;
// 				} else if (nameA > nameB) {
// 					return 1;
// 				} else {
// 					return 0;
// 				}
// 			});

// 			return allAccounts;
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async getFacebookAccountByStoreId(storeId) {
// 		try {
// 			const facebookAdsAccount = await this.redisClient.hgetall(
// 				`facebook_ads_account:${storeId}`
// 			);
// 			return facebookAdsAccount;
// 		} catch (error) {
// 			logger.error('Error retrieving Facebook Ads account: %s', error);
// 			throw error;
// 		};
// 	};

// 	async createFacebookAdsAccount(account) {
// 		try {
// 			await this.redisClient.hset(`facebook_ads_account:${account.storeId}`, account);
// 			logger.info(`Facebook Ads account hash '${account.storeId}' persisted`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async deleteFacebookAdsAccount(storeId) {
// 		try {
// 			await this.redisClient.del(`facebook_ads_account:${storeId}`);
// 			logger.info(`Facebook Ads account hash '${storeId}' deleted`);
// 			await this.revokeFacebookAccessFromStore(storeId);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async fetchActiveFacebookCampaigns(storeId) {
// 		try {
// 			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
// 			const actId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id')

// 			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${actId}/campaigns`;

// 			const response = await axios.get(url, {
// 				params: {
// 					access_token: facebookAccessToken,
// 					fields: 'id,name',
// 					effective_status: ['ACTIVE']
// 				}
// 			});

// 			return response.data;
// 		} catch (error) {
// 			logger.error('Error retrieving Facebook campaigns: %s', error.response?.data?.error.message || error);
// 			throw error;
// 		}
// 	};

// 	async fetchFacebookCampaignAdSets(storeId, campaignId) {
// 		try {
// 			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
// 			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${campaignId}/adsets`;

// 			const response = await axios.get(url, {
// 				params: {
// 					access_token: facebookAccessToken,
// 					fields: 'id,name',
// 					effective_status: ['ACTIVE']
// 				}
// 			});

// 			return response.data;
// 		} catch (error) {
// 			logger.error('Error retrieving Facebook ad sets: %s', error.response?.data?.error.message || error);
// 			throw error;
// 		}
// 	};

// 	async fetchFacebookAdsExpenses(storeId, timeRange) {
// 		try {
// 			const timeRangeKey = `${timeRange.since}__${timeRange.until}`;
// 			const cacheKey = `facebook_ads_expenses:${storeId}:${timeRangeKey}`;
// 			const cacheDuration = 600;

// 			const cachedAdsExpenses = await this.redisClient.get(cacheKey);
// 			if (cachedAdsExpenses) {
// 				const parsedAdsExpenses = JSON.parse(cachedAdsExpenses);
// 				const ttl = await this.redisClient.ttl(cacheKey);
// 				logger.info(`Fetched Facebook Ads expenses '${storeId}:${timeRangeKey}' from cache. TTL: ${ttl}`);
// 				return { allAdsMetrics: parsedAdsExpenses, ttl };
// 			}

// 			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
// 			const accountId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id');
// 			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${accountId}/insights`;

// 			const daysDiff = differenceInDays(new Date(timeRange.until), new Date(timeRange.since));
// 			const isSingleDay = daysDiff === 0;

// 			const segmentation = isSingleDay ? { breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone' } : { time_increment: 1 };

// 			let params = {
// 				access_token: facebookAccessToken,
// 				fields: 'spend',
// 				time_range: JSON.stringify(timeRange),
// 				...segmentation,
// 				limit: 250
// 			};

// 			let allAdsMetrics = [];

// 			while (url) {
// 				const { data: adsInsights } = await axios.get(url, {
// 					params
// 				});

// 				adsInsights.data.forEach(insight => {
// 					let indexHour;
// 					let adsMetrics = {
// 						id: '',
// 						name: '',
// 						metricsBreakdown: []
// 					};

// 					if (isSingleDay) {
// 						indexHour = insight.hourly_stats_aggregated_by_advertiser_time_zone.slice(0, 2);
// 					}
// 					let intervalData = {
// 						date: isSingleDay ? `${insight.date_start}T${indexHour}` : `${insight.date_start}`,
// 						metrics: {
// 							spend: insight.spend || 0
// 						}
// 					}
// 					adsMetrics.id = insight.id;
// 					adsMetrics.name = insight.name;
// 					adsMetrics.metricsBreakdown.push(intervalData);
// 					allAdsMetrics.push(adsMetrics);
// 				});

// 				url = adsInsights.paging.next;
// 			};

// 			await this.redisClient.set(cacheKey, JSON.stringify(allAdsMetrics), 'ex', cacheDuration);
// 			logger.info(`Facebook Ads expenses for '${storeId}:${timeRangeKey}' cached. TTL: ${cacheDuration}`);
// 			return { allAdsMetrics, ttl: cacheDuration };
// 		} catch (error) {
// 			logger.error('Error retrieving Facebook Ads expenses: %s', error.response?.data?.error.message || error);
// 			throw error;
// 		}
// 	};

// 	async fetchFacebookAdsInsights(storeId, adNameQuery, timeRange) {
// 		try {
// 			const timeRangeKey = `${timeRange.since}__${timeRange.until}`;
// 			const cacheKey = `facebook_ads_insights:${storeId}:${timeRangeKey}`;
// 			const cacheDuration = 1800;

// 			const cachedAdsInsights = await this.redisClient.get(cacheKey);
// 			if (cachedAdsInsights) {
// 				const parsedAdsInsights = JSON.parse(cachedAdsInsights);
// 				const ttl = await this.redisClient.ttl(cacheKey);
// 				logger.info(`Fetched Facebook Ads insights '${storeId}:${timeRangeKey}' from cache. TTL: ${ttl}`);
// 				return { adInsights: parsedAdsInsights, ttl };
// 			}

// 			const facebookAccessToken = await this.redisClient.hget(`store:${storeId}`, 'facebookAccessToken');
// 			const actId = await this.redisClient.hget(`facebook_ads_account:${storeId}`, 'id')
// 			let url = `https://graph.facebook.com/${process.env.FACEBOOK_API_GRAPH_VERSION}/${actId}/ads`;

// 			const adCreativesFields = 'name,thumbnail_url'
// 			const insightsFields = 'spend,impressions,outbound_clicks,purchase_roas,actions';
// 			const insightsFilters = [{ 'field': 'action_type', 'operator': 'IN', 'value': ['purchase', 'omni_purchase', 'landing_page_view', 'outbound_click'] }];
// 			const filters = [];
// 			const limit = 250;
// 			if (adNameQuery) filters.push({ 'field': 'ad.name', 'operator': 'CONTAIN', 'value': adNameQuery });

// 			const response = await axios.get(url, {
// 				params: {
// 					access_token: facebookAccessToken,
// 					fields: `id,name,adcreatives.fields(${adCreativesFields}).thumbnail_width(256).thumbnail_height(256),insights.fields(${insightsFields}).filtering(${JSON.stringify(insightsFilters)}).time_range(${JSON.stringify(timeRange)})`,
// 					filtering: filters,
// 					limit
// 				}
// 			});

// 			const { data: adInsightsData } = response.data;
// 			const adInsights = adInsightsData.map(adInsightData => {
// 				const { id, name, adcreatives, insights } = adInsightData;
// 				const creativeData = adcreatives?.data[0];
// 				const insightData = insights?.data[0];
// 				const purchaseROAsAction = insightData?.purchase_roas?.find(purchaseRoas => purchaseRoas.action_type === 'omni_purchase');
// 				const outboundClickAction = insightData?.outbound_clicks?.find(outboundClick => outboundClick.action_type === 'outbound_click');

// 				return {
// 					id,
// 					name,
// 					creativeId: creativeData.id,
// 					creativeName: creativeData.name,
// 					creativeThumbnail: creativeData.thumbnail_url,
// 					spend: Number(insightData?.spend) || 0,
// 					impressions: Number(insightData?.impressions) || 0,
// 					outboundClicks: Number(outboundClickAction?.value) || 0,
// 					pageViews: Number((insightData?.actions?.find(action => action.action_type === 'landing_page_view')?.value)) || 0,
// 					purchases: Number((insightData?.actions?.find(action => action.action_type === 'purchase')?.value)) || 0,
// 					purchasesConversionValue: Number(insightData?.spend * purchaseROAsAction?.value) || 0,
// 					CTR: Number(outboundClickAction?.value / insightData?.impressions * 100) || 0,
// 					CPS: Number(insightData?.spend / (insightData?.actions?.find(action => action.action_type === 'landing_page_view')?.value)) || 0,
// 					CPA: Number(insightData?.spend / (insightData?.actions?.find(action => action.action_type === 'purchase')?.value)) || 0,
// 					ROAS: Number(purchaseROAsAction?.value) || 0,
// 				}
// 			})

// 			await this.redisClient.set(cacheKey, JSON.stringify(adInsights), 'ex', cacheDuration);
// 			logger.info(`Facebook Ads insights for '${storeId}:${timeRangeKey}' cached. TTL: ${cacheDuration}`);
// 			return { adInsights, ttl: cacheDuration };
// 		} catch (error) {
// 			logger.error('Error retrieving Facebook Ads insights: %s', error.response?.data?.error.message || error);
// 			throw error.response?.data?.error.message || error;
// 		}
// 	};
// };

// module.exports = FacebookController;
