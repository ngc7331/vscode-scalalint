import { statSync } from 'fs';
import { configFile } from './main';

export let configReady: boolean = false;

export function ensureConfig() {
    const stat = statSync(configFile, { throwIfNoEntry: false });

    // config exists, good to go
    if (stat && stat.isFile()) {
        console.info(`scalastyle config found at: ${configFile}`);
        configReady = true;
        return;
    }

    console.info(`No scalastyle config at ${configFile}, disable scalastyle check`);
}
