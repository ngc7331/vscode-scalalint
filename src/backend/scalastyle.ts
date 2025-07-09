import * as vscode from 'vscode';

import exec from 'child_process';
import { statSync } from 'fs';

import { downloadFile } from '../utils/download';
import { resolvePath } from '../utils/path';

import { Backend, CheckResult } from './interface';

let binFile: string;
let binReady: boolean = false;
let configFile: string;
let configReady: boolean = false;

function ensureBin() {
    const stat = statSync(binFile, { throwIfNoEntry: false });

    // bin exists, good to go
    if (stat && stat.isFile()) {
        console.log('scalastyle binary found at:', binFile);
        binReady = true;
        return;
    }

    // ask if we should download\
    const binUrl = 'https://oss.sonatype.org/content/repositories/releases/org/scalastyle/scalastyle_2.12/1.0.0/scalastyle_2.12-1.0.0-batch.jar';
    console.log(`No scalastyle binary at ${binFile}, prompting for download`);
    vscode.window.showInformationMessage(
        `scalastyle binary not found at ${binFile}. Download it?`,
        'Yes', 'No'
    ).then((selection) => {
        if (selection !== 'Yes') {
            vscode.window.showInformationMessage('scalastyle binary download cancelled.');
            return;
        }
        // download the scalastyle binary
        vscode.window.showInformationMessage(`Downloading scalastyle binary from ${binUrl}...`);
        downloadFile(binUrl, binFile, (error) => {
            if (error) {
                vscode.window.showErrorMessage(`Failed to download scalastyle binary: ${error.message}`);
                return;
            }
            vscode.window.showInformationMessage(`scalastyle binary downloaded to ${binFile}.`);
            binReady = true;
        });
    });
}

function ensureConfig() {
    const stat = statSync(configFile, { throwIfNoEntry: false });

    // config exists, good to go
    if (stat && stat.isFile()) {
        console.log(`scalastyle config found at: ${configFile}`);
        configReady = true;
        return;
    }

    console.log(`No scalastyle config at ${configFile}, disable scalastyle check`);
}

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

    console.log('Running scalastyle...');

    const stdout = exec.execFileSync(
        'java',
        [
            '-jar', binFile,
            '--config', configFile,
            src
        ]
    ).toString();

    const results = stdout.split("\n").map( (l) => {
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

        return {
            severity,
            file,
            message,
            range
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
