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

// reference: https://github.com/scalastyle/scalastyle/blob/ec14399543d2d5ccf93c3713aa5df21793844791/src/main/resources/reference.conf
const scalastyleMessageTable = new Map<string, RegExp>([
    ['file.FileLengthChecker', /File length exceeds \d+ lines/],
    ['file.FileLineLengthChecker', /File line length exceeds \d+ characters/],
    ['file.FileTabChecker', /Line contains a tab/],
    ['file.HeaderMatchesChecker', /Header does not match expected text/],
    ['file.IndentationChecker', /Use correct indentation/],
    ['file.NewLineAtEofChecker', /File must end with newline character/],
    ['file.NoNewLineAtEofChecker', /File must not end with newline character/],
    ['file.RegexChecker', /Regular expression matched '.*'/],
    ['file.WhitespaceEndOfLineChecker', /Whitespace at end of line/],
    ['scalariform.BlockImportChecker', /Avoid block imports/],
    ['scalariform.ClassNamesChecker', /Class name does not match the regular expression '.*'/],
    ['scalariform.ClassTypeParameterChecker', /Type parameter does not match '.*'/],
    ['scalariform.CovariantEqualsChecker', /Covariant equals without overriding equals\(java\.lang\.Object\)\./],
    ['scalariform.CyclomaticComplexityChecker', /Cyclomatic complexity of \d+ exceeds max of \d+/],
    ['scalariform.DeprecatedJavaChecker', /@deprecated should be used instead of @java\.lang\.Deprecated/],
    ['scalariform.DisallowSpaceAfterTokenChecker', /Space after token .*/],
    ['scalariform.DisallowSpaceBeforeTokenChecker', /Space before token .*/],
    ['scalariform.EmptyClassChecker', /Redundant braces after class definition/],
    ['scalariform.EmptyInterpolatedStringChecker', /Unnecessary use of interpolated string/],
    ['scalariform.EnsureSingleSpaceAfterTokenChecker', /No space after token .*/],
    ['scalariform.EnsureSingleSpaceBeforeTokenChecker', /No space before token .*/],
    ['scalariform.EqualsHashCodeChecker', /You should implement equals and hashCode together/],
    ['scalariform.FieldNamesChecker', /Field name does not match the regular expression '.*'/],
    ['scalariform.ForBraceChecker', /Use braces in for comprehensions/],
    ['scalariform.IfBraceChecker', /If block needs braces/],
    ['scalariform.IllegalImportsChecker', /Import from illegal package/],
    ['scalariform.ImportGroupingChecker', /Imports should be grouped together/],
    ['scalariform.ImportOrderChecker', /Imports should be ordered according to the configuration/],
    ['scalariform.LowercasePatternMatchChecker', /Lowercase pattern match \(surround with ``, or add : Any\)/],
    ['scalariform.MagicNumberChecker', /Magic Number/],
    ['scalariform.MethodArgumentNamesChecker', /Method argument name does not match the regular expression '.*'/],
    ['scalariform.MethodLengthChecker', /Method is longer than \d+ lines/],
    ['scalariform.MethodNamesChecker', /Method name does not match the regular expression '.*'/],
    ['scalariform.MultipleStringLiteralsChecker', /The string literal .+ appears \d+ times in the file\./],
    ['scalariform.NamedArgumentChecker', /Argument should be named/],
    ['scalariform.NoCloneChecker', /Avoid using clone method\./],
    ['scalariform.NoFinalizeChecker', /Avoid using finalize method\./],
    ['scalariform.NoWhitespaceAfterLeftBracketChecker', /There should be no space after a left bracket '\['/],
    ['scalariform.NoWhitespaceBeforeLeftBracketChecker', /There should be no space before a left bracket '\['/],
    ['scalariform.NoWhitespaceBeforeRightBracketChecker', /There should be no space before a right bracket '\]'/],
    ['scalariform.NonASCIICharacterChecker', /Non ASCII characters are not allowed/],
    ['scalariform.NotImplementedErrorUsage', /Usage of \?\?\? operator/],
    ['scalariform.NullChecker', /Avoid using null/],
    ['scalariform.NumberOfMethodsInTypeChecker', /Number of methods in class exceeds \d+/],
    ['scalariform.NumberOfTypesChecker', /Number of types declared in the file exceeds \d+/],
    ['scalariform.ObjectNamesChecker', /Object name does not match the regular expression '.*'/],
    ['scalariform.OverrideJavaChecker', /You should be using the Scala override keyword instead/],
    ['scalariform.PackageNamesChecker', /Package name does not match the regular expression '.*'/],
    ['scalariform.PackageObjectNamesChecker', /Package object name does not match the regular expression '.*'/],
    ['scalariform.ParameterNumberChecker', /The number of parameters should not exceed \d+/],
    ['scalariform.PatternMatchAlignChecker', /Pattern match arrows do not align/],
    ['scalariform.ProcedureDeclarationChecker', /Use : Unit = for procedures/],
    ['scalariform.PublicMethodsHaveTypeChecker', /Public method must have explicit type/],
    ['scalariform.RedundantIfChecker', /Eliminate redundant if expressions where both branches return constant booleans/],
    ['scalariform.ReturnChecker', /Avoid using return/],
    ['scalariform.ScalaDocChecker', /Missing or badly formed ScalaDoc: .*/],
    ['scalariform.SimplifyBooleanExpressionChecker', /Boolean expression can be simplified/],
    ['scalariform.SpaceAfterCommentStartChecker', /Insert a space after the start of the comment/],
    ['scalariform.SpacesAfterPlusChecker', /There should be a space after the plus \(\+\) sign/],
    ['scalariform.SpacesBeforePlusChecker', /There should be a space before the plus \(\+\) sign/],
    ['scalariform.StructuralTypeChecker', /Avoid using structural types/],
    ['scalariform.TodoCommentChecker', /Use of TODO\/FIXME comment/],
    ['scalariform.TokenChecker', /Regular expression matched '.*' in a token/],
    ['scalariform.UnderscoreImportChecker', /Avoid wildcard imports/],
    ['scalariform.UppercaseLChecker', /Use an uppercase L for long literals/],
    ['scalariform.VarFieldChecker', /Avoid mutable fields/],
    ['scalariform.VarLocalChecker', /Avoid mutable local variables/],
    ['scalariform.WhileChecker', /Avoid using while loops/],
    ['scalariform.XmlLiteralChecker', /Avoid xml literals/],
]);

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
