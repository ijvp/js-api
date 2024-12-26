import express, { Request, Response, Router, NextFunction } from 'express';
import logger from '../utils/logger';
import { logIn, logOut } from '../utils/session';
import { encrypt, decrypt } from '../utils/crypto';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import ShopController from './shop';
import ResourceController from './resource';

export default class AuthController extends ResourceController {
	readonly shopController: ShopController;

	constructor() {
		super('/auth');
		this.initializeRoutes();
	}

	initializeRoutes(): void {
		this.router.post('/register', this.register);
		this.router.post('/login', this.login);
		this.router.get('/logout', auth, this.logout);
		this.router.post('/update', auth, this.update);
		this.router.get('/me', this.whoAmI);
	}

	async register(req: Request, res: Response) {
		try {
			const { username, password } = req.body;
			const { guid } = req.query;

			if (!(username && password)) {
				res.status(400).json({ success: false, message: 'Missing fields' });
			}

			if (!guid) {
				res.status(400).json({ success: false, message: 'Invalid request' });
			}

			const found = await User.exists({ username });
			if (found) {
				res.status(409).json({ success: false, message: 'Username taken' });
			};

			const user = await User.create({ username, password: encrypt(password) });

			const storeId = guid ? decrypt(decodeURIComponent(guid.toString())) : null;
			if (storeId) {
				logger.warn(`[TODO]: Associating store with user: ${storeId} - ${user.id}`);
				// await this.storeController.associateStoreWithUser(storeId, user.id);
			};

			await logIn(req, user.id);
			res.status(201).json({ success: true, message: `User '${user.username}' was created successfully` });
		} catch (error) {
			logger.error(error);
			res.status(500).json({ success: false, message: 'Internal server error' });
		}
	}

	async login(req: Request, res: Response) {
		const { username, password } = req.body;

		// try {
		// 	const found = await User.findOne({ username });
		// 	const passwordsMatch = await found?.matchesPassword(password);

		// 	if (!found || !passwordsMatch) {
		// 		res.status(401).json({ success: false, message: 'Invalid username/password' });
		// 	}

		// 	await logIn(req, found.id);
		// 	res.json({ success: true, message: "User logged in" });
		// } catch (error) {
		// 	logger.error(error);
		// 	res.status(500).json({ success: false, message: 'Internal Server Error' });
		// }
		logger.info('Login route hit', { username, password });
		res.status(200).json({ success: true, message: 'User logged in' });
	}

	async logout(req: Request, res: Response) {
		await logOut(req, res);
		res.clearCookie('connect.sid');
		res.status(200).json({ success: true, message: "User logged out" });
	}

	async update(req: Request, res: Response) {
		const { username, password, newPassword } = req.body;

		logger.info('Update route hit', { username, password, newPassword });
		res.status(200).json({ success: true, message: 'User updated successfully' });
		// if (!(username && password)) {

		// 	res.status(400).json({ success: false, message: 'Invalid request body' });
		// };

		// const user = await User.findById(req.session.userId);
		// if (!user) {
		// 	res.status(404).json({ success: false, message: 'User not found' });
		// }

		// if (username !== user.username) {
		// 	user.username = username;
		// 	try {
		// 		await user.save();
		// 	} catch (error) {
		// 		logger.error(error);
		// 		res.status(500).json({ success: false, message: 'Something went wrong' });
		// 	};
		// };

		// if (newPassword) {
		// 	if (newPassword === password) {
		// 		res.status(400).json({ success: false, message: 'New password cannot be the same as previous password' });
		// 	};

		// 	user.password = encrypt(newPassword);
		// 	try {
		// 		user.save();
		// 		res.status(200).json({ success: true, message: 'User updated successfully' });
		// 	} catch (error) {
		// 		logger.error(error);
		// 		res.status(500).json({ success: false, message: 'Internal server error' });
		// 	};
		// };
	}

	async whoAmI(req: Request, res: Response) {
		// const { id, username } = await User.findById(req.session.userId);
		logger.info('WhoAmI route hit');
		res.status(200).json({ id: 1, username: 'test' });
	}
}

// const router = Router();

// const storeController = new StoreController(redis.redisClient);

// router.post('/auth/register', async (req, res) => {
// 	try {
// 		const { username, password } = req.body;
// 		const { guid } = req.query;

// 		if (!(username && password)) {
// 			return res.status(400).json({ success: false, message: 'Por favor preencha todos os campos' });
// 		}

// 		const found = await User.exists({ username });
// 		if (found) {
// 			return res.status(409).json({ success: false, message: 'Esse nome de usuário ja existe' });
// 		};

// 		const user = await User.create({ username, password: encrypt(password) });

// 		const storeId = decrypt(decodeURIComponent(guid));
// 		if (storeId) {
// 			await storeController.associateStoreWithUser(storeId, user.id);
// 		};

// 		await logIn(req, user.id);
// 		return res.status(201).json({ success: true, message: `User '${user.username}' was created successfully` });
// 	} catch (error) {
// 		logger.error(error);
// 		return res.status(500).json({ success: false, message: 'Internal server error' });
// 	}
// });

// router.post('/auth/login', async (req, res) => {
// 	const { username, password } = req.body;

// 	try {
// 		const found = await User.findOne({ username });
// 		const passwordsMatch = await found?.matchesPassword(password);

// 		if (!found || !passwordsMatch) {
// 			return res.status(401).json({ success: false, message: 'Invalid username/password' });
// 		}

// 		await logIn(req, found.id);
// 		res.json({ success: true, message: "User logged in" });
// 	} catch (error) {
// 		logger.error(error);
// 		return res.status(500).json({ success: false, message: 'Internal Server Error' });
// 	}
// });

// router.post('/auth/update', auth, async (req, res) => {
// 	const { username, password, newPassword } = req.body;

// 	if (!(username && password)) {
// 		return res.status(400).json({ success: false, message: 'Invalid request body' });
// 	};

// 	const user = await User.findById(req.session.userId);
// 	if (!user) {
// 		return res.status(404).json({ success: false, message: 'User not found' });
// 	}

// 	if (username !== user.username) {
// 		user.username = username;
// 		try {
// 			await user.save();
// 		} catch (error) {
// 			logger.error(error);
// 			return res.status(500).json({ success: false, message: 'Something went wrong' });
// 		};
// 	};

// 	if (newPassword) {
// 		if (newPassword === password) {
// 			return res.status(400).json({ success: false, message: 'New password cannot be the same as previous password' });
// 		};

// 		user.password = encrypt(newPassword);
// 		try {
// 			user.save();
// 			return res.status(200).json({ success: true, message: 'User updated successfully' });
// 		} catch (error) {
// 			logger.error(error);
// 			return res.status(500).json({ success: false, message: 'Internal server error' });
// 		};
// 	};
// });

// router.get('/auth/logout', auth, async (req, res, next) => {
// 	await logOut(req, res);
// 	res.clearCookie('connect.sid');
// 	res.status(200).json({ success: true, message: "User logged out" });
// });

// router.get('/auth/me', auth, async (req, res) => {
// 	const { id, username } = await User.findById(req.session.userId);
// 	res.status(200).json({ id, username });
// });
