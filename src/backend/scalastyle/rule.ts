import * as vscode from 'vscode';

import { readFileSync } from 'fs';

import { configFile } from './main';
import { scalastyleMessageTable } from './scalastyleMessageTable';

export interface Rule {
    line: number;
    checker: string;
    message: RegExp;
}

const rules: Rule[] = [];

enum ParseConfigRulesState {
    Init,
    RegexChecker,
}

// should be called after ensureConfig makes sure that configFile exists
export function loadConfigRules() {
    if (!vscode.workspace.getConfiguration('scalalint').get('scalastyle.parseRule') as boolean) {
        return;
    }

    const config = readFileSync(configFile, 'utf-8').split("\n");

    let state = ParseConfigRulesState.Init;
    for (let i = 0; i < config.length; i++) {
        const line = config[i].trim();

        if (state === ParseConfigRulesState.RegexChecker) {
            const match = line.match(/<customMessage>(.*?)<\/customMessage>/);
            if (match) {
                rules[rules.length - 1].message = new RegExp(match[1]);
                state = ParseConfigRulesState.Init;
            }
        }

        // regex match <check.*?class="([^"]+)"
        const match = config[i].match(/^\s*<check.*?class="([^"]+)"/);
        if (!match) {
            continue;
        }

        const checker = match[1].replace('org.scalastyle.', '');
        if (checker === 'file.RegexChecker') {
            state = ParseConfigRulesState.RegexChecker;
        }

        const message = scalastyleMessageTable.get(checker);
        if (!message) {
            console.warn(`No message found for checker: ${checker}`);
            continue;
        }

        rules.push({
            line: i + 1,
            checker,
            message
        });
    }

    console.debug(`Loaded rules from config file:`, rules);
}

export function getMatchingRule(message: string): Rule | undefined {
    if (!vscode.workspace.getConfiguration('scalalint').get('scalastyle.parseRule') as boolean) {
        return undefined;
    }

    console.info('Trying to match message');

    return rules.find(rule => rule.message.test(message));
}
