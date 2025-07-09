import { statSync } from 'fs';
import * as vscode from 'vscode';
import { downloadFile } from '../../utils/download';
import { binFile } from './main';

export let binReady: boolean = false;

export function ensureBin() {
    const stat = statSync(binFile, { throwIfNoEntry: false });

    // bin exists, good to go
    if (stat && stat.isFile()) {
        console.info('scalastyle binary found at:', binFile);
        binReady = true;
        return;
    }

    // ask if we should download\
    const binUrl = 'https://oss.sonatype.org/content/repositories/releases/org/scalastyle/scalastyle_2.12/1.0.0/scalastyle_2.12-1.0.0-batch.jar';
    console.info(`No scalastyle binary at ${binFile}, prompting for download`);
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
