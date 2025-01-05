import path from 'path';
import dockerCompose from 'docker-compose';
import { execSync } from 'child_process';

export default async () => {
    console.time('global-teardown');
    await dockerCompose.down({
        cwd: path.join(__dirname),
        log: true
    });
    console.timeEnd('global-teardown');
};
