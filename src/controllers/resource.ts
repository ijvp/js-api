import express, { Router, RequestHandler } from "express";


export default abstract class ResourceController {
    readonly path: string;
    readonly router: Router;

    constructor(path: string, middlewares: Array<RequestHandler> = []) {
        this.path = path;
        this.router = express.Router();
        
        if (middlewares.length > 0) {
            this.router.use(middlewares);
        }
    }

    abstract initializeRoutes(): void;
}