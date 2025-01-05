import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import App from "./app";
import logger from "./utils/logger";
import DefaultController from "./controllers/default";
import AuthController from "./controllers/auth";
import ShopController from "./controllers/shop";


interface AppConfig {
    environment: string;
    port: number;
}

const appConfig: AppConfig = {
    environment: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "8080")
}

logger.info('Starting app in %s mode', appConfig.environment);

const app = new App(
    [
        new DefaultController(),
        new AuthController(),
        new ShopController()
    ],
    appConfig
);

app.listen();