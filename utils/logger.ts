import pino, { Logger } from 'pino';
import { format } from 'date-fns';

const logger: Logger = pino({
	transport: {
		target: 'pino-pretty',
		options: {
			ignore: 'pid,hostname'
		}
	},

	// base: {
	// 	pid: false
	// },
	// timestamp: () => `,"time":"${format(new Date(), 'dd-MM-yyyy')}`,
});

export default logger;