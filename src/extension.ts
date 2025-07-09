import * as vscode from 'vscode';

import { scalastyleBackend } from './backend/scalastyle';
import { Backend } from './backend/interface';

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

	const saveTrigger = vscode.workspace.onDidSaveTextDocument(() => {
		if (vscode.workspace.getConfiguration('scalalint').get('runOnSave')) {
			run();
		}
	});

	context.subscriptions.push(commandTrigger);
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

	const results = backends.flatMap(backend => backend.run(src));
	console.info(`Found ${results.length} issues.`);
	console.debug('Results:', results);

	// refresh diagnostics
	diagnosticCollection.clear();
	const diagnostics: vscode.Diagnostic[] = results.map(result => {
		const severity = result.severity;
		const range = result.range;
		const message = result.message;
		const diagnostic = new vscode.Diagnostic(range, message, severity);
		diagnostic.source = result.file;
		return diagnostic;
	});

	diagnosticCollection.set(vscode.Uri.file(src), diagnostics);
}
