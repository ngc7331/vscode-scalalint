import * as vscode from 'vscode';

export interface Backend {
    name: string;
    activate: (context: vscode.ExtensionContext) => void;
    deactivate: () => void;
    run: (src: string) => vscode.Diagnostic[];
    cleanup: () => void;
    reload: () => void;
}
