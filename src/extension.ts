import * as vscode from 'vscode';

import { Backend, scalastyleBackend } from './backend';

const backends: Backend[] = [
    scalastyleBackend,
];

const diagnosticCollection = vscode.languages.createDiagnosticCollection('scalalint');

export function activate(context: vscode.ExtensionContext) {
    console.info('Activating scalalint extension...');

    backends.forEach(backend => backend.activate(context));

    const runTriggers = [
        vscode.commands.registerCommand('scalalint.run', run),

        vscode.window.onDidChangeActiveTextEditor(run),

        vscode.workspace.onDidSaveTextDocument(() => {
            if (vscode.workspace.getConfiguration('scalalint').get('runOnSave')) {
              run();
            }
        }),
    ];

    const cleanupTriggers = [
        vscode.commands.registerCommand('scalalint.cleanup', cleanup),
    ];

    const reloadTriggers = [
        vscode.commands.registerCommand('scalalint.reload', reload),
    ];

    context.subscriptions.push(...runTriggers);
    context.subscriptions.push(...cleanupTriggers);
    context.subscriptions.push(...reloadTriggers);

    // run the first time
    run();
}

export function deactivate() {
    console.info('Deactivating scalalint extension...');
    backends.forEach(backend => backend.deactivate());
}

function run() {
    const src = vscode.window.activeTextEditor?.document.fileName;
    if (!src) {
        console.info('No active text editor found. Cannot run scalalint.');
        return;
    }

    console.info(`Running scalalint for ${src}...`);

    const diagnostics = backends.flatMap( backend => {
        if (!vscode.workspace.getConfiguration('scalalint').get(`${backend.name}.enable`)) {
            console.info(`Skipping backend ${backend.name} as it is disabled in settings.`);
            return [];
        }
        return backend.run(src);
    });
    console.info(`Found ${diagnostics.length} issues.`);
    console.debug('Diagnostics:', diagnostics);

    diagnosticCollection.set(vscode.Uri.file(src), diagnostics);
}

// cleanup stored backend data
function cleanup() {
    console.info('Cleaning up scalalint extension...');
    backends.forEach(backend => backend.cleanup());

    // prompt user to reload window
    vscode.window.showInformationMessage(
        'Scalalint cleanup completed. Reload the window to apply changes?',
        'Yes', 'No'
    ).then((selection) => {
        if (selection === 'Yes') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        } else {
            vscode.window.showInformationMessage('Scalalint cleanup completed. You can reload the window later.');
        }
    });
}

function reload() {
    console.info('Reloading scalalint extension...');
    diagnosticCollection.clear();
    backends.forEach(backend => backend.reload());
    run();
}
