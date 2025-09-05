// extension.js
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

let trackerProvider; // هيعرض النتائج في الـ Sidebar

function activate(context) {
    trackerProvider = new TrackerProvider([]);
    vscode.window.registerTreeDataProvider("reactFileTreckerView", trackerProvider);

    // ✅ نعمل unregister للكوماند لو كان موجود قبل كدا
    unregisterCommand("react-file-trecker.findImports");
    unregisterCommand("react-file-trecker.openFile");

    // ✅ command: البحث عن الملفات المستوردة
    const disposable = vscode.commands.registerCommand("react-file-trecker.findImports", async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
        }

        const currentFilePath = editor.document.uri.fsPath;
        // اسم الملف مع الامتداد
        const currentFileBase = path.basename(currentFilePath);
        // اسم الملف من غير الامتداد
        const currentFileName = currentFileBase.replace(/\.(js|jsx|ts|tsx)$/, "");
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

                // ✅ Regex جديد:
                // - g = global
                // - i = ignore case
                // - يطابق import بالاسم أو الاسم+الامتداد
                const importRegex = new RegExp(
                    `from ['"][^'"]*${currentFileName}(\\.(js|jsx|ts|tsx))?['"]`,
                    "gi"
                );
                const dynamicRegex = new RegExp(
                    `import\\s+.*\\s+from\\s+['"][^'"]*${currentFileName}(\\.(js|jsx|ts|tsx))?['"]`,
                    "gi"
                );

                if (importRegex.test(content) || dynamicRegex.test(content)) {
                    results.push({
                        label: path.relative(workspaceRoot, file.fsPath),
                        filePath: file.fsPath
                    });
                }

            } catch (err) {
                console.error("Error reading file:", file.fsPath);
            }
        }

        trackerProvider.setResults(results);

        if (results.length === 0) {
            vscode.window.showInformationMessage(`No files are importing "${currentFileName}"`);
        } else {
            vscode.window.showInformationMessage(`Found ${results.length} files importing "${currentFileName}"`);
        }
    });

    // ✅ command: فتح الملف عند الضغط عليه في الـ Sidebar
    const openFileCommand = vscode.commands.registerCommand("react-file-trecker.openFile", (filePath) => {
        const openPath = vscode.Uri.file(filePath);
        vscode.workspace.openTextDocument(openPath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    });

    context.subscriptions.push(disposable, openFileCommand);
}

class TrackerProvider {
    constructor(items) {
        this.items = items;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    setResults(results) {
        this.items = results.map(item => ({
            label: item.label,
            filePath: item.filePath,
            command: {
                command: "react-file-trecker.openFile",
                title: "Open File",
                arguments: [item.filePath]
            }
        }));
        this.refresh();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren() {
        return this.items;
    }
}

function deactivate() {}

// ✅ helper function: لو الكوماند متسجل قبل كدا يتشال
async function unregisterCommand(commandId) {
    const commands = await vscode.commands.getCommands(true);
    if (commands.includes(commandId)) {
        const temp = vscode.commands.registerCommand(commandId, () => {});
        temp.dispose();
    }
}

module.exports = {
    activate,
    deactivate,
};
