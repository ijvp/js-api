import { Request, Response } from 'express';
import ResourceController from "./resource";

export default class UserController extends ResourceController {
    constructor() {
        super('/user');
        this.initializeRoutes();
    }

    initializeRoutes(): void {
        this.router.get('/stores', this.getStores.bind(this));
        this.router.delete('/store', this.deleteStore.bind(this));
        this.router.get('/store/connections', this.getStoreConnections.bind(this));
    }

    getStores(req: Request, res: Response) {
        // 	try {
        // 		const stores = [];
        // 		const storeIds = await storeController.getStoresByUserId(req.session.userId);
        // 		const storesPromises = storeIds.map(async storeId => {
        // 			const store = await redisClient.hgetall(`store:${storeId}`);
        // 			return store;
        // 		});

        // 		stores.push(... await Promise.all(storesPromises));
        // 		return res.json(stores);
        // 	} catch (error) {
        // 		return res.status(500).json({ success: false, error: "Internal Server Error" });
        // 	}
    };

    deleteStore(req: Request, res: Response) {
        // 	try {
        // 		const { store } = req.query;
        // 		const { userId } = req.session;
        // 		await storeController.deleteStoreData(store, userId);
        // 		res.json({
        // 			success: true, message: `Store '${store}' data deleted successfully }`
        // 		})
        // 	} catch (error) {
        // 		return res.status(500).json({ success: false, error: "Internal Server Error" });
        // 	}
    };

    getStoreConnections(req: Request, res: Response) {
        // 	const { store } = req.query;

        // 	if (!store) {
        // 		return res.status(400).json({ success: false, error: "Missing store parameter" });
        // 	};

        // 	try {
        // 		const connections = await storeController.getStoreConnections(store);
        // 		return res.json(connections);
        // 	} catch (error) {
        // 		return res.status(500).json({ success: false, error: "Internal Server Error" });
        // 	}
    };
};