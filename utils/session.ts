import { Request } from "express";

export const logIn = (req: Request, userId: string) => {
	req.session.userId = userId;
	req.session.save(err => {
		if (err) throw err;
	});
};

export const logOut = (req: Request, res: Response) => {
	new Promise<void>((resolve, reject) => {
		req.session.destroy(err => {
			if (err) reject(err);
			resolve();
		});
	});
};

export const isLoggedIn = (req: Request) => {
	return !!req.session.userId;
};