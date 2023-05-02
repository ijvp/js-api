const pino = require('pino');
const { format } = require('date-fns');

const logger = pino({
	transport: {
		target: 'pino-pretty',
		options: {
			ignore: 'pid,hostname'
		}
	},

	// base: {
	// 	pid: false
	// },
	// timestamp: () => `,"time":"${format(new Date(), 'dd-mm-yyyy')}`,
});

module.exports = logger;