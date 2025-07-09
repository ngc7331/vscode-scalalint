import * as vscode from 'vscode';

export interface Backend {
    name: string;
    activate: (context: vscode.ExtensionContext) => void;
    deactivate: () => void;
    run: (src: string) => CheckResult[];
}

export interface CheckResult {
    severity: vscode.DiagnosticSeverity;
    file: string;
    range: vscode.Range;
    message: string;
}
