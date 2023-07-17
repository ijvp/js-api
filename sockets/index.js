const socketIO = require('socket.io');
const logger = require('../utils/logger');

let io;

function initialize(server) {
	io = socketIO(server, {
		cors: {
			origin: '*'
		}
	});

	io.on('connection', (socket) => {
		logger.info('WebSocket connected');

		socket.on('disconnect', () => {
			logger.info('WebSocket disconnected');
		});
	});
}

function getIO() {
	if (!io) {
		throw new Error('Socket.io has not been initialized');
	}
	return io;
}

module.exports = {
	initialize,
	getIO,
};
