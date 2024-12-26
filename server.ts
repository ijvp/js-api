import App from "./app";
import logger from "./utils/logger";
import DefaultController from "./controllers/default";
import AuthController from "./controllers/auth";
import ShopController from "./controllers/shop";


const appConfig = {
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