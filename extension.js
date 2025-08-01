const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("React Import Tracker");

    const disposable = vscode.commands.registerCommand("react-file-trecker.findImports", async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
        }

        const currentFilePath = editor.document.uri.fsPath;
        const currentFileName = path.basename(currentFilePath).replace(/\.(js|jsx|ts|tsx)$/, "");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceRoot) {
            vscode.window.showInformationMessage("No workspace open");
            return;
        }

        const allFiles = await vscode.workspace.findFiles("**/*.{js,jsx,ts,tsx}", "**/node_modules/**");

        const results = [];

        for (const file of allFiles) {
            if (file.fsPath === currentFilePath) continue;

            try {
                const content = fs.readFileSync(file.fsPath, "utf8");
                const importRegex = new RegExp(`from ['"].*${currentFileName}['"]`, "g");

                const dynamicRegex = new RegExp(`import\\s+.*\\s+from\\s+['"](.*${currentFileName})['"]`, "g");

                if (importRegex.test(content) || dynamicRegex.test(content)) results.push(path.relative(workspaceRoot, file.fsPath));

            } catch (err) {
            console.error("Error reading file:", file.fsPath);
            }
        }

        outputChannel.clear();
        outputChannel.show(true);

        if (results.length === 0) {
            outputChannel.appendLine(`No files are importing "${currentFileName}"`);
        } else {
            outputChannel.appendLine(`🔍 Found ${results.length} files importing "${currentFileName}":\n`);
            results.forEach((file, i) => {
                outputChannel.appendLine(`${i + 1}. ${file}`);
            });
        }
        }
    );


    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};