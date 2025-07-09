import * as vscode from 'vscode';

import exec from 'child_process';

import { resolvePath } from '../../utils/path';

import { Backend, CheckResult } from '../interface';
import { scalastyleMessageTable } from './messageTable';
import { ensureBin, binReady } from './ensureBin';
import { ensureConfig, configReady } from './ensureConfig';

export let binFile: string;
export let configFile: string;

function activate(context: vscode.ExtensionContext) {
    const extensionPath = context.extensionUri.fsPath;
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    binFile = resolvePath(
        extensionPath,
        'bin/scalastyle.jar'
    );
    configFile = resolvePath(
        workspacePath,
        vscode.workspace.getConfiguration('scalalint').get('scalastyle.configFile') as string
    );

    ensureBin();
    ensureConfig();
}

function deactivate() {}

function run(src: string): CheckResult[] {
    if (!binReady || !configReady) {
        return [];
    }

    console.info('Running scalastyle...');

    const stdout = exec.execFileSync(
        'java',
        [
            '-jar', binFile,
            '--config', configFile,
            src
        ]
    ).toString();

    const results = stdout.split("\n").map( l => {
        console.debug(`Parsing line: ${l}`);
        const match = l.match(/^(.+?) file=(.+?) message=(.+?)(?: line=(\d+))?(?: column=(\d+))?$/);
        if (!match) {
            console.debug(`... failed`);
            return null;
        }
        const [, severityStr, file, message, lineStr, columnStr] = match;

        const line = lineStr ? parseInt(lineStr) - 1 : 0;
        const column = columnStr ? parseInt(columnStr) : 0;

        const columnEnd =
            vscode.window.activeTextEditor?.document.fileName === file ?
            vscode.window.activeTextEditor.document.lineAt(line).text.length :
            column + 1
        ;

        const severity =
            severityStr === 'error' ? vscode.DiagnosticSeverity.Error :
            severityStr === 'warning' ? vscode.DiagnosticSeverity.Warning :
            severityStr === 'info' ? vscode.DiagnosticSeverity.Information :
            vscode.DiagnosticSeverity.Hint
        ;

        const range = new vscode.Range(
            new vscode.Position(line, column),
            new vscode.Position(line, columnEnd)
        );

        const source =
            vscode.workspace.getConfiguration('scalalint').get('scalastyle.parseRule') as boolean ?
            `scalastyle: ${
                Array.from(scalastyleMessageTable.entries()).find(([key, regex]) => {
                    return regex.test(message);
                })?.[0] || 'CustomRule'
            }` :
            undefined
        ;

        return {
            backend: scalastyleBackend,
            severity,
            file,
            message,
            range,
            source
        };
    }).filter(result => result !== null);

    return results;
}

export const scalastyleBackend: Backend = {
    name: 'scalastyle',
    activate,
    deactivate,
    run
};
