import { homedir } from 'os';
import { resolve } from 'path';

export function resolvePath(...paths: string[]): string {
    return resolve(...paths.flatMap(path => {
        if (path.startsWith('~/')) {
            return [ homedir(), path.slice(2) ];
        }
        return [ path ];
    }));
}
