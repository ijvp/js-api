import { Server } from 'socket.io';
import { Server as HttpServer } from "http"
import logger from '../utils/logger';


//TODO: factory pattern for socket server/processors as an exercise
export default class SocketServer {
	private readonly io: Server;

	constructor(server: HttpServer) {
		//TODO: Add redis adapter
		//TODO: review config when you get to HTTPS client-certificate authentication
		this.io = new Server(server, {});

		this.io.on('connection', (socket) => {
			logger.info('WebSocket connected');

			socket.on('disconnect', () => {
				logger.info('WebSocket disconnected');
			});
		});
	}

	public getIO() {
		if (!this.io) {
			throw new Error('Socket not initialized');
		}
		return this.io;
	}
}
