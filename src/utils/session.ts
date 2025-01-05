import { Request, Response } from "express";

declare module "express-session" {
	interface SessionData {
		userId?: string;
	}
}

export const logIn = (req: Request, userId: string): void => {
	req.session.userId = userId;
	req.session.save(err => {
		if (err) throw err;
	});
};

export const logOut = (req: Request, res: Response): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		req.session.destroy(err => {
			if (err) reject(err);
			resolve();
		});
	});
};

export const isLoggedIn = (req: Request): boolean => {
	return !!req.session.userId;
};