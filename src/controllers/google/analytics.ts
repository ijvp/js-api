import { Request, Response } from 'express';
import ResourceController from "../resource";

export default class GoogleAnalyticsController extends ResourceController {
    constructor() {
        super('/google-analytics');
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/auth', this.login.bind(this));
        this.router.get('/auth/callback', this.callback.bind(this));
        this.router.get('/accounts', this.getAccounts.bind(this));
        this.router.post('/account/connect', this.connectAccount.bind(this));
        this.router.get('/account/disconnect', this.disconnectAccount.bind(this));
        this.router.get('/product-sessions', this.getProductSessions.bind(this));
        this.router.get('/product-sessions/:productId', this.getProductSessionById.bind(this));
    }

    login(req: Request, res: Response): void {
        //   const { store, service } = req.query;

        //   if (!store) {
        //     return res.status(400).json({ success: false, message: 'Invalid request query, missing store' })
        //   }

        //   oauth2Client = new google.auth.OAuth2(
        //     `${GOOGLE_CLIENT_ID}`,
        //     `${GOOGLE_CLIENT_SECRET}`,
        //     `${process.env.URL}/${service}/callback`
        //   );

        //   let redirect = oauth2Client.generateAuthUrl({
        //     access_type: 'offline',
        //     prompt: 'consent',
        //     scope: [
        //       GOOGLE_SCOPES[service]
        //     ],
        //     state: store,
        //     include_granted_scopes: true
        //   });

        //   return res.status(200).json(redirect);
    }

    callback(req: Request, res: Response): void {
        //   const { code, state: shop } = req.query;

        //   oauth2Client.getToken(code, async (error, token) => {
        //     if (error) {
        //       return res.status(500).json({ success: false, error });
        //     };

        //     try {
        //       await googleController.grantGoogleAnalyticsAccessToStore(shop, token);
        //       return res.redirect(`${process.env.FRONTEND_URL}/integracoes?platform=google-analytics&store=${shop}`);
        //     } catch (error) {
        //       logger.error(error);
        //       return res.status(500).json({ success: false, message: "Internal Server Error" })
        //     }
        //   });
    }

    getAccounts(req: Request, res: Response): void {
        //   const { store } = req.query;
        //   const accounts = await googleController.getGoogleAnalyticsAccounts(store);
        //   res.json(accounts);
    }

    connectAccount(req: Request, res: Response): void {
        //   const { account, store } = req.body;
        //   if (!(account)) {
        //     return res.status(400).send({ success: false, message: 'Invalid request body' });
        //   }

        //   try {
        //     await googleController.storeGoogleAnalyticsProperty({ ...account, storeId: store });
        //     return res.status(201).json({
        //       success: true, message: `Google Ads account ${account.name} added to ${store}`
        //     });
        //   } catch (error) {
        //     return res.status(500).json({ success: false, error: 'Internal server error' });
        //   }
    }

    disconnectAccount(req: Request, res: Response): void {
        //   const { store, account } = req.query;
        //   await googleController.removeGoogleAnalyticsProperty(store, account);
        //   res.status(204).send();
    }

    getProductSessions(req: Request, res: Response): void {
        //   try {
        //     const { store, start, end } = req.query;
        //     const dates = { start, end };
        //     const productPagesSessions = await googleController.fetchProductPageSessions(store, dates);
        //     res.status(200).json(productPagesSessions);
        //   } catch (error) {
        //     logger.error("Failed to fetch product sessions %s", error);
        //     res.status(500).json({ success: false, message: 'Internal server error' });
        //   }
    }

    getProductSessionById(req: Request, res: Response): void {
        //   try {
        //     const { productId } = req.params;
        //     const { store, start, end } = req.query;
        //     const dates = { start, end };

        //     const product = await storeController.getProduct(store, productId);
        //     const pagesSessions = await googleController.fetchProductPageSessions(store, dates);

        //     const productPageSessions = pagesSessions.sessions.find(pageSessions => {
        //       return pageSessions.pagePath.split("/").slice(-1)[0] === product.handle;
        //     });

        //     return res.json(productPageSessions);
        //   } catch (error) {
        //     logger.error(`Failed to fetch product sessions for product ${req.params.productId} %s`, error);
        //     res.status(500).json({ success: false, message: 'Internal server error' });
        //   }
    }
}