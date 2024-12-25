import App from "./app";
import AuthController from "./routes/auth";

const appConfig = {
    environment: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "8080")
}

const app = new App([new AuthController()], appConfig);

app.listen();