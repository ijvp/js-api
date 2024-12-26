import App from "./app";
import DefaultController from "./controllers/default";
import AuthController from "./routes/auth";
import ShopController from "./controllers/shop";

const appConfig = {
    environment: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "8080")
}

const app = new App(
    [
        new DefaultController(),
        new AuthController(),
        new ShopController()
    ],
    appConfig
);

app.listen();