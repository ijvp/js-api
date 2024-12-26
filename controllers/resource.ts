import express, { Router } from "express";

export default abstract class ResourceController {
    readonly path: string;
    readonly router: Router;

    constructor(path: string) {
        this.path = path;
        this.router = express.Router();
    }

    abstract initializeRoutes(): void;
}