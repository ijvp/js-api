import { google } from 'googleapis';
import logger from '../utils/logger';
import { GoogleAdsApi } from 'google-ads-api';

export default class GoogleService {
	public readonly authClient: any;
	public readonly googleAdsClient: GoogleAdsApi;
	public readonly googleAnalyticsClient: any;


	private readonly GOOGLE_SCOPES = {
		'google-ads': 'https://www.googleapis.com/auth/adwords',
		'google-analytics': 'https://www.googleapis.com/auth/analytics.readonly'
	};

	constructor() {
		this.authClient = new google.auth.OAuth2(
			`${process.env.GOOGLE_CLIENT_ID}`,
			`${process.env.GOOGLE_CLIENT_SECRET}`
		);

		this.googleAdsClient = new GoogleAdsApi({
			client_id: `${process.env.GOOGLE_CLIENT_ID}`,
			client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
			developer_token: `${process.env.GOOGLE_MANAGE_TOKEN
				}`,
		});

		this.googleAnalyticsClient = google.analyticsreporting('v4');
	}

	getSupportedAPIs(): { [index: string]: string[] } {
		return google.getSupportedAPIs();
	}

	// generateApiAuthUrl(service: string) {
	// 	const supportedAPIs = this.getSupportedAPIs();

	// 	if (!Object.keys(supportedAPIs).includes(service)) {
	// 		throw new Error(`Service ${service} is not supported.`);
	// 	}

	// 	const oauth2Client = new google.auth.OAuth2(
	// 		`${process.env.GOOGLE_CLIENT_ID}`,
	// 		`${process.env.GOOGLE_CLIENT_SECRET}`,
	// 		`${process.env.URL}/${service}/auth/callback`
	// 	);

	// 	return oauth2Client.generateAuthUrl({
	// 		access_type: 'offline',
	// 		prompt: 'consent',
	// 		scope: [
	// 			`${process.env.GOOGLE_SCOPES[service]}`,
	// 		],
	// 		include_granted_scopes: true
	// 	});
	// }
}

// const googleClient = new GoogleAdsApi({
// 	client_id: `${process.env.GOOGLE_CLIENT_ID}`,
// 	client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
// 	developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
// });

// export default googleClient;