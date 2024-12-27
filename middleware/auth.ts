import { Request, Response, NextFunction } from 'express';
import { isLoggedIn } from "../utils/session"; // Assuming isLoggedIn is in authService.ts
import logger from "../utils/logger"; // Assuming logger is properly set up

export class UnauthenticatedError extends Error {
	public readonly status: string;
	public readonly statusCode: number;
	
	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
		

		Error.captureStackTrace(this, this.constructor);
	}
}

export const auth = (req: Request, res: Response, next: NextFunction): void => {
    if (!isLoggedIn(req)) {
        logger.warn(`Unauthenticated request at '${req.originalUrl}'`);
        const err = new UnauthenticatedError("User is not logged in", 401);
		next(err);
    }

	next();
};

export const errorHandler = (error, req: Request, res: Response, next: NextFunction) => {
	error.statusCode = error.statusCode || 500;
	error.status = error.status || "error";
	error.message = error.message || "Internal server error";
	
	res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
};