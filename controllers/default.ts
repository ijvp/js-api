import { Request, Response } from 'express';
import ResourceController from './resource';
import logger from '../utils/logger';

class DefaultController extends ResourceController {
    constructor() {
        super('');
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/', this.redirectToAuthMe);
        this.router.get('/ping', this.ping);
    }

    private ping(req: Request, res: Response) {
        logger.info("Pong!");
        res.json({ message: 'pong' });
    }

    private redirectToAuthMe(req: Request, res: Response) {
        res.redirect('/auth/me');
    }
}

export default DefaultController;