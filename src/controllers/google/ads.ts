import { Request, Response } from 'express';
import ResourceController from "../resource";
import GoogleService from '../../services/google';
import logger from "../../utils/logger";


export default class GoogleAdsController extends ResourceController {
    public readonly googleService: GoogleService;

    // const googleAds = new GoogleAdsApi({
    // 	client_id: `${process.env.GOOGLE_CLIENT_ID}`,
    // 	client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
    // 	developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
    // });

    constructor() {
        super('/google-ads');
        this.initializeRoutes();

        this.googleService = new GoogleService();
    }

    initializeRoutes(): void {
        this.router.get('/supported-apis', this.getSupportedAPIs.bind(this));
        this.router.get('/auth', this.login.bind(this));
        this.router.get('/auth/callback', this.callback.bind(this));
        this.router.get('/accounts', this.getAccounts.bind(this));
        this.router.post('/account/connect', this.connectAccount.bind(this));
        this.router.get('/account/disconnect', this.disconnectAccount.bind(this));
        this.router.post('/ad-expenses', this.getAdExpenses.bind(this));
    }

    getSupportedAPIs(req: Request, res: Response): void {
        const apis = this.googleService.getSupportedAPIs();
        res.json(apis);
    }

    login(req: Request, res: Response): void {
        const redirectUrl: string = this.googleService.generateApiAuthUrl('google-ads');
        res.redirect(redirectUrl);
    }

    async callback(req: Request, res: Response): Promise<void> {
        const { code, state: shop } = req.query;

        await this.googleService.getAuthToken(code!.toString(), 'google-ads')
            .then(async (token) => {
                logger.info(`Token: ${token}`);
                res.json({ success: true, message: "Token received" });
            })
            .catch((error) => {
                logger.error(error);
                res.status(500).json({ success: false, message: "Internal Server Error" });
            });


        //   oauth2Client.getToken(code, async (error, token) => {
        //     if (error) {
        //       return res.status(500).json({ success: false, error });
        //     };

        //     try {
        //       await googleController.grantGoogleAdsAccessToStore(shop, token);
        //       return res.redirect(`${process.env.FRONTEND_URL}/integracoes?platform=google-ads&store=${shop}`);
        //     } catch (error) {
        //       logger.error(error);
        //       return res.status(500).json({ success: false, message: "Internal Server Error" })
        //     }
        //   });
    }

    getAccounts(req: Request, res: Response): void {
        //   try {
        //     const { store } = req.query;
        //     const accounts = await googleController.fetchGoogleAdsAccountList(store);
        //     res.status(200).json(accounts);
        //   } catch (error) {
        //     res.status(500).json({ success: false, message: 'Internal server error' });
        //   }
    }

    connectAccount(req: Request, res: Response): void {
        //   try {
        //     const { store, account } = req.body;
        //     await googleController.storeGoogleAdsAccount({ store, ...account });
        //     res.status(200).json({ success: true, message: 'Account connected' });
        //   } catch (error) {
        //     res.status(500).json({ success: false, message: 'Internal server error' });
        //   }

        //OR

        //   const { account, store } = req.body;
        //   if (!(account)) {
        //     return res.status(400).send({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     await googleController.storeGoogleAdsAccount({ ...account, storeId: store });
        //     return res.status(201).json({
        //       success: true, message: `Google Ads account ${account.name} added to ${store}`
        //     });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: 'Internal server error' });
        //   }
    }

    disconnectAccount(req: Request, res: Response): void {
        //   try {
        //     const { store } = req.query;
        //     await googleController.deleteGoogleAdsAcccount(store);
        //     return res.status(201).json({
        //       success: true, message: `Google Ads account disconnected from '${store}'`
        //     });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: 'Internal server error' });
        //   };
    }

    getAdExpenses(req: Request, res: Response): void {
        //   const { start, end, store, granularity } = req.body;

        //   if (!start && !end) {
        //     return res.status(400).send('Start date and end date must be set');
        //   };

        //   const difference = differenceInDays(new Date(), new Date(start))

        //   const isEndToday = differenceInDays(new Date(end), endOfToday()) === 0
        //   const isYESTERDAY = differenceInDays(new Date(end), startOfToday()) === 0
        //   const isTodayOrYESTERDAY = isEndToday || isYESTERDAY

        //   let dateRange = getTimePeriodString({ difference, isTodayOrYESTERDAY })

        //   try {
        //     const response = await axios.post(`${process.env.PYEND_URL}/google-ads/ads`, {
        //       store: store,
        //       start,
        //       end,
        //       dateRange
        //     })

        //     // tem que reordenar aqui por algum motivo, mesmo o python devolvendo em ordem...
        //     return res.status(200).send({
        //       ...response.data, metricsBreakdown: response.data.metricsBreakdown.sort((a, b) => {
        //         return new Date(a.date) - new Date(b.date);
        //       })
        //     });

        //   } catch (error) {
        //     logger.error(error);
        //     return res.status(500).json({ success: false, message: 'Internal server error' });
        //   };
    }
}

// const googleAnalytics = google.analyticsreporting('v4');

// class GoogleController {
// 	constructor(redisClient) {
// 		this.redisClient = redisClient;
// 		this.googleAds = googleAds;
// 		this.googleAnalytics = googleAnalytics;
// 	}

// 	// Google Ads
// 	async grantGoogleAdsAccessToStore(storeId, tokens) {
// 		try {
// 			await this.redisClient.hmset(`store:${storeId}`, {
// 				googleAdsAccessToken: tokens.access_token,
// 				googleAdsRefreshToken: tokens.refresh_token,
// 				googleAdsExpiryDate: tokens.expiry_date
// 			});
// 			logger.info(`Granted store '${storeId}' access to Google Ads API`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async revokeGoogleAdsAccessFromStore(storeId) {
// 		try {
// 			await this.redisClient.hdel(`store:${storeId}`, 'googleAdsAccessToken', 'googleAdsRefreshToken');
// 			logger.info(`Revoked store '${storeId}' access to Google Ads APIs`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async fetchGoogleAdsAccountList(storeId) {
// 		try {
// 			const token = await this.redisClient.hget(`store:${storeId}`, 'googleAdsRefreshToken');
// 			const { resource_names } = await this.googleAds.listAccessibleCustomers(token);
// 			let accounts = await Promise.all(resource_names.map(async resourceName => {
// 				const customerId = resourceName.split('customers/')[1];
// 				const customer = this.googleAds.Customer({
// 					customer_id: customerId,
// 					refresh_token: token
// 				});

// 				try {
// 					const response = await customer.report({
// 						entity: 'customer_client',
// 						attributes: ['customer_client.id', 'customer_client.resource_name', 'customer_client.descriptive_name']
// 					});

// 					// when returning manager account, it will have several entries with different customer_clients
// 					// we want the manager account itself, otherwise descriptive_name is null;
// 					const { customer_client } = response.find(account => account.customer_client.id.toString() === customerId);
// 					return customer_client;
// 				} catch (error) {
// 					logger.error(error.message);
// 					return;
// 				}
// 			}));

// 			accounts = accounts.filter(account => !!account && account.descriptive_name);
// 			accounts.sort((a, b) => {
// 				const nameA = a.descriptive_name.toUpperCase();
// 				const nameB = b.descriptive_name.toUpperCase();

// 				if (nameA < nameB) {
// 					return -1;
// 				} else if (nameA > nameB) {
// 					return 1;
// 				} else {
// 					return 0;
// 				}
// 			});
// 			accounts.map(account => { return { id: account.id, name: account.descriptive_name } });
// 			return accounts;
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async getGoogleAdsAccountByStoreId(storeId) {
// 		try {
// 			const googleAdsAccount = await this.redisClient.hgetall(
// 				`google_ads_account:${storeId}`
// 			);
// 			return googleAdsAccount;
// 		} catch (error) {
// 			logger.error('Error retrieving Google Ads account: %s', error);
// 			throw error;
// 		};
// 	};

// 	async storeGoogleAdsAccount(account) {
// 		try {
// 			await this.redisClient.hset(`google_ads_account:${account.storeId}`, account);
// 			logger.info(`Google Ads account hash '${account.storeId}' persisted`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async deleteGoogleAdsAcccount(storeId) {
// 		try {
// 			const numKeys = await this.redisClient.del(`google_ads_account:${storeId}`);
// 			if (numKeys) {
// 				logger.info(`Google Ads account hash '${storeId}' deleted`);
// 				await this.revokeGoogleAdsAccessFromStore(storeId);
// 			} else {
// 				logger.info(`No Google Ads account hash '${storeId}' founf`);
// 			}
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	// Google Analytics
// 	async grantGoogleAnalyticsAccessToStore(storeId, tokens) {
// 		try {
// 			await this.redisClient.hmset(`store:${storeId}`, {
// 				googleAnalyticsAccessToken: tokens.access_token,
// 				googleAnalyticsRefreshToken: tokens.refresh_token,
// 				googleAnalyticsExpiryDate: tokens.expiry_date
// 			});
// 			logger.info(`Granted store '${storeId}' access to Google Analytics API`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async revokeGoogleAnalyticsAccessFromStore(storeId) {
// 		try {
// 			await this.redisClient.hdel(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
// 			logger.info(`Revoked store '${storeId}' access to Google Analytics APIs`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async fetchGoogleAnalyticsPropertiesList(storeId) {
// 		try {
// 			const tokens = await this.redisClient.hmget(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
// 			const authClient = new google.auth.OAuth2(`${process.env.GOOGLE_CLIENT_ID}`, `${process.env.GOOGLE_CLIENT_SECRET}`);
// 			authClient.setCredentials({ access_token: tokens[0], refresh_token: tokens[1] });

// 			const analytics = google.analyticsadmin('v1alpha');
// 			let accounts = [];
// 			let nextPage = "";
// 			do {
// 				const { data } = await analytics.accountSummaries.list({ auth: authClient, pageSize: 200, pageToken: nextPage });
// 				const propertySummaries = data.accountSummaries.flatMap(accountSummary => {
// 					return accountSummary.propertySummaries?.map(propertySummary => {
// 						return { id: propertySummary.property.split("/")[1], name: propertySummary.displayName }
// 					})
// 				}).filter(item => !!item);

// 				accounts.push(...propertySummaries);
// 				nextPage = data.nextPageToken;
// 			} while (nextPage);

// 			return accounts;
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async getGoogleAnalyticsPropertyByStoreId(storeId) {
// 		try {
// 			const googleAnalyticsAccount = await this.redisClient.hgetall(
// 				`google_analytics_property:${storeId}`
// 			);
// 			return googleAnalyticsAccount;
// 		} catch (error) {
// 			logger.error('Error retrieving Google Analytics account: %s', error);
// 			throw error;
// 		}
// 	};

// 	async storeGoogleAnalyticsProperty(account) {
// 		try {
// 			await this.redisClient.hset(`google_analytics_property:${account.storeId}`, account);
// 			logger.info(`Google Analytics account hash '${account.storeId}' persisted`);
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async deleteGoogleAnalyticsProperty(storeId) {
// 		try {
// 			const numKeys = await this.redisClient.del(`google_analytics_property:${storeId}`);
// 			if (numKeys) {
// 				logger.info(`Google Analytics property hash '${storeId}' deleted`);
// 				await this.revokeGoogleAnalyticsAccessFromStore(storeId);
// 			} else {
// 				logger.info(`No Google Analytics property hash '${storeId}' found`);
// 			}
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};

// 	async fetchProductPageSessions(storeId, dates) {
// 		try {
// 			const dateRangeKey = `${dates.start}__${dates.end}`;
// 			const cacheKey = `product_page_sessions:${storeId}:${dateRangeKey}`;
// 			const cacheDuration = 300;

// 			const cachedSessions = await this.redisClient.get(cacheKey);
// 			if (cachedSessions) {
// 				const parsedSessions = JSON.parse(cachedSessions);
// 				const ttl = await this.redisClient.ttl(cacheKey);
// 				logger.info(`Fetched product page sessions '${storeId}:${dateRangeKey}' from cache. TTL: ${ttl}`);
// 				return { sessions: parsedSessions, ttl };
// 			}

// 			// 1.)	get analytics tokens
// 			// 2.)	get google_analytics_account hash -> ga4 propertyId
// 			// 3.)	call analytics library runReport function with propertyId
// 			//			and pass authClient
// 			// 4.)	transform googleResponse into turboDashResponse
// 			const tokens = await this.redisClient.hmget(`store:${storeId}`, 'googleAnalyticsAccessToken', 'googleAnalyticsRefreshToken');
// 			const authClient = new google.auth.OAuth2(`${process.env.GOOGLE_CLIENT_ID}`, `${process.env.GOOGLE_CLIENT_SECRET}`);
// 			authClient.setCredentials({ access_token: tokens[0], refresh_token: tokens[1] });
// 			const dateRange = formatGoogleDateRange(dates.start, dates.end);
// 			const analytics = google.analyticsdata('v1beta')
// 			const { id } = await this.getGoogleAnalyticsPropertyByStoreId(storeId);
// 			// query built using https://ga-dev-tools.google/ga4/query-explorer/

// 			const { data: report } = await analytics.properties.runReport({
// 				auth: authClient,
// 				property: `properties/${id}`,
// 				requestBody: {
// 					dimensions: [
// 						{
// 							name: 'pagePath'
// 						}
// 					],
// 					dimensionFilter: {
// 						filter: {
// 							fieldName: 'pagePath',
// 							stringFilter: {
// 								matchType: "CONTAINS",
// 								value: "products"
// 							}
// 						}
// 					},
// 					metrics: [
// 						{
// 							name: "sessions"
// 						}
// 					],
// 					dateRanges: [
// 						dateRange,
// 					],
// 				}
// 			});


// 			const sessionsData = report.rows.map(row => ({
// 				pagePath: row.dimensionValues[0].value,
// 				sessions: row.metricValues[0].value
// 			}));

// 			await this.redisClient.set(cacheKey, JSON.stringify(sessionsData), 'ex', cacheDuration);
// 			logger.info(`Product page sessions for '${storeId}:${dateRangeKey}' cached. TTL: ${cacheDuration}`);
// 			return { sessions: sessionsData, ttl: cacheDuration };
// 		} catch (error) {
// 			logger.error(error);
// 			throw error;
// 		}
// 	};
// };
