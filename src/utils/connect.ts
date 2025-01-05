import { Socket } from 'node:net';
// import mongoose from 'mongoose';
import logger from './logger';

// export const connect = () => {
// 	mongoose.set('strictQuery', true); //warning suppression
// 	mongoose.connect(process.env.DB_CONNECT)
// 		.then(() => logger.info("Connected to MongoDB"))
// 		.catch(error => { logger.error(error); process.exit(1) });
// };

interface PortOptions {
	host?: string;
	timeout?: number;
}

export async function isPortReachable(port: number, { host, timeout = 1000 }: PortOptions = {}) {
	if (!host) {
		logger.info('No host provided, defaulting to localhost');
		host = 'localhost';
	}

	const promise = new Promise(((resolve, reject) => {
		const socket = new Socket();

		const onError = () => {
			socket.destroy();
			reject();
		};

		socket.setTimeout(timeout);
		socket.once('error', onError);
		socket.once('timeout', onError);

		socket.connect(port, host, () => {
			socket.end();
			resolve(true);
		});
	}));

	try {
		await promise;
		return true;
	} catch {
		return false;
	}
};

