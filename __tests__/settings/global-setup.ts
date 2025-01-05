import path from 'path';
import logger from '../../src/utils/logger';
import dockerCompose from 'docker-compose';
import { isPortReachable } from '../../src/utils/connect';


logger.info('Starting global setup for tests');
export default async () => {
    console.time('\nglobal-setup');

    const isRedisCacheReachable = await isPortReachable(6379);

    if (!isRedisCacheReachable) {
        await dockerCompose.upAll({
            cwd: path.join(__dirname),
            log: true
        });
    }

    console.timeEnd('\nglobal-setup');
};
