import * as vscode from 'vscode';

import { Backend, scalastyleBackend } from './backend';

const backends: Backend[] = [
    scalastyleBackend,
];

const diagnosticCollection = vscode.languages.createDiagnosticCollection("scalalint");

export function activate(context: vscode.ExtensionContext) {
    console.info('Activating scalalint extension...');

    backends.forEach(backend => backend.activate(context));

    const commandTrigger = vscode.commands.registerCommand('scalalint.run', () => {
        run();
    });

    const changeActiveTrigger = vscode.window.onDidChangeActiveTextEditor(() => {
		console.info('Active text editor changed. Running scalalint...');
        run();
    });

    const saveTrigger = vscode.workspace.onDidSaveTextDocument(() => {
        if (vscode.workspace.getConfiguration('scalalint').get('runOnSave')) {
            run();
        }
    });

    context.subscriptions.push(commandTrigger);
    context.subscriptions.push(changeActiveTrigger);
    context.subscriptions.push(saveTrigger);
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

    // refresh diagnostics
    diagnosticCollection.clear();
    diagnosticCollection.set(vscode.Uri.file(src), diagnostics);
}
