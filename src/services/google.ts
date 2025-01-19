import { GoogleAdsApi } from 'google-ads-api';

const googleClient = new GoogleAdsApi({
	client_id: `${process.env.GOOGLE_CLIENT_ID}`,
	client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
	developer_token: `${process.env.GOOGLE_MANAGE_TOKEN}`,
});

export default googleClient;