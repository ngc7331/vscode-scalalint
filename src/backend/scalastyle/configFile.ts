import { statSync } from 'fs';

import { configFile } from './main';
import { loadConfigRules } from './rule';

export let configReady: boolean = false;

export function ensureConfig() {
    const stat = statSync(configFile, { throwIfNoEntry: false });

    // config exists, good to go
    if (stat && stat.isFile()) {
        console.info(`scalastyle config found at: ${configFile}`);
        loadConfigRules();
        configReady = true;
        return;
    }

    console.info(`No scalastyle config at ${configFile}, disable scalastyle check`);
}
