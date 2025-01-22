import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import App from "./app";
import logger from "./utils/logger";
import DefaultController from "./controllers/default";
import AuthController from "./controllers/auth";
import ShopController from "./controllers/shop";
import { AppConfiguration } from './ts/interfaces/app';
import GoogleAdsController from './controllers/google/ads';
import GoogleAnalyticsController from './controllers/google/analytics';
import FacebookController from './controllers/facebook';


const appConfig: AppConfiguration = {
    environment: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "8080")
}

logger.info('Starting app in %s mode', appConfig.environment);
if (appConfig.environment === 'local') {
    logger.warn('Running locally: Make sure you have a local Redis server running and that your tunnel is online.');
}

const app = new App(
    [
        new DefaultController(),
        new AuthController(),
        new ShopController(),
        new GoogleAdsController(),
        new GoogleAnalyticsController(),
        new FacebookController()
    ],
    appConfig
);

app.listen();