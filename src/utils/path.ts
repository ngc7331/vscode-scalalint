import { homedir } from 'os';
import { resolve } from 'path';

export function resolvePath(...paths: string[]): string {
    paths = paths.map(path => {
        if (path.startsWith('~/')) {
            return resolve(homedir(), path.slice(2));
        }
        return path;
    })

    return resolve(...paths);
}
