import * as vscode from 'vscode';
import exec from 'child_process';

import { resolvePath } from '../../utils/path';

import { Backend } from '../interface';

import { ensureBin, binReady, deleteBin, reloadBin } from './binFile';
import { ensureConfig, configReady, reloadConfig } from './configFile';
import { getMatchingRule } from './rule';

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

function run(src: string): vscode.Diagnostic[] {
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
    ).toString().split('\n');

    const diagnostics: vscode.Diagnostic[] = [];
    for (const l of stdout) {
        console.debug(`Parsing line: ${l}`);
        const match = l.match(/^(.+?) file=(.+?) message=(.+?)(?: line=(\d+))?(?: column=(\d+))?$/);
        if (!match) {
            console.debug(`... failed`);
            continue
        }
        const [, severityStr, file, message, lineStr, columnStr] = match;

        const line = lineStr ? parseInt(lineStr) - 1 : 0;
        const column = columnStr ? parseInt(columnStr) : 0;

        const columnEnd =
            vscode.window.activeTextEditor?.document.fileName === file ?
            vscode.window.activeTextEditor.document.lineAt(line).text.length :
            column + 1
        ;

        const range = new vscode.Range(
            new vscode.Position(line, column),
            new vscode.Position(line, columnEnd)
        );

        const severity =
            severityStr === 'error' ? vscode.DiagnosticSeverity.Error :
            severityStr === 'warning' ? vscode.DiagnosticSeverity.Warning :
            severityStr === 'info' ? vscode.DiagnosticSeverity.Information :
            vscode.DiagnosticSeverity.Hint
        ;

        const matchRule = getMatchingRule(message);

        const diagnostic = new vscode.Diagnostic(
            range,
            message,
            severity
        );
        diagnostic.source = scalastyleBackend.name;
        diagnostic.code = matchRule ? {
            value: matchRule.checker,
            target: vscode.Uri.from({
                scheme: 'file',
                path: configFile,
                fragment: `L${matchRule.line}`
            }),
        } : undefined;

        diagnostics.push(diagnostic);
    }

    return diagnostics;
}

function cleanup() {
    deleteBin();
}

function reload() {
    reloadBin();
    reloadConfig();
}

export const scalastyleBackend: Backend = {
    name: 'scalastyle',
    activate,
    deactivate,
    run,
    cleanup,
    reload
};
