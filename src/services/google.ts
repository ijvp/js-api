import { google } from 'googleapis';
import logger from '../utils/logger';


enum GOOGLE_SCOPES {
	'google-ads' = 'https://www.googleapis.com/auth/adwords',
	'google-analytics' = 'https://www.googleapis.com/auth/analytics.readonly'
};


export default class GoogleService {
	// public readonly authClient: any;
	// public readonly googleAdsClient: GoogleAdsApi;
	// public readonly googleAnalyticsClient: any;

	constructor() {
		// this.authClient = new google.auth.OAuth2(
		// 	`${process.env.GOOGLE_CLIENT_ID}`,
		// 	`${process.env.GOOGLE_CLIENT_SECRET}`
		// );

		// this.googleAnalyticsClient = google.analyticsreporting('v4');
	}

	getSupportedAPIs(): { [index: string]: string[] } {
		return google.getSupportedAPIs();
	}

	generateApiAuthUrl(service: keyof typeof GOOGLE_SCOPES): string {
		const oauth2Client = new google.auth.OAuth2(
			`${process.env.GOOGLE_CLIENT_ID}`,
			`${process.env.GOOGLE_CLIENT_SECRET}`,
			`https://${process.env.URL}/${service}/auth/callback`
		);

		return oauth2Client.generateAuthUrl({
			access_type: 'offline',
			prompt: 'consent',
			scope: [
				`${GOOGLE_SCOPES[service]
				}`,
			],
			include_granted_scopes: true
		});
	}

	getAuthToken(code: string, service: keyof typeof GOOGLE_SCOPES): Promise<any> {
		const oauth2Client = new google.auth.OAuth2(
			`${process.env.GOOGLE_CLIENT_ID}`,
			`${process.env.GOOGLE_CLIENT_SECRET}`,
			`https://${process.env.URL}/${service}/auth/callback`
		);

		return new Promise((resolve, reject) => {
			oauth2Client.getToken(code, (error, token) => {
				if (error) {
					logger.error(error);
					reject(error);
				}

				logger.info(token);
				resolve(token);
			});
		});
	}
}

// const googleClient = new GoogleAdsApi({
// 	client_id: `${ process.env.GOOGLE_CLIENT_ID }`,
// 	client_secret: `${ process.env.GOOGLE_CLIENT_SECRET }`,
// 	developer_token: `${ process.env.GOOGLE_MANAGE_TOKEN }`,
// });

// export default googleClient;