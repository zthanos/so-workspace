import * as vscode from "vscode";

const out = vscode.window.createOutputChannel("SO Workspace");

function log(msg: string) {
  out.appendLine(msg);
}

async function executeTask(
  label: string,
  scriptName: string,
  args: string[] = []
): Promise<void> {
  log(`[SO] Creating task: "${label}"`);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folder open");
  }

  // Try to find script in the correct locations based on extension structure
  let scriptPath: vscode.Uri | null = null;
  
  // First, try scripts directory relative to the extension's location (tools/so-vsix/scripts)
  scriptPath = vscode.Uri.joinPath(
    workspaceFolder.uri,
    "scripts",
    scriptName
  );

  try {
    await vscode.workspace.fs.stat(scriptPath);
    log(`[SO] Found script in extension scripts: ${scriptPath.fsPath}`);
  } catch {
    // If not found, try the repo root scripts directory (../..)
    scriptPath = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "..",
      "..",
      "scripts",
      scriptName
    );
    
    try {
      await vscode.workspace.fs.stat(scriptPath);
      log(`[SO] Found script at repo root: ${scriptPath.fsPath}`);
    } catch {
      // If still not found, try the scripts directory in the extension folder directly
      const extensionScriptsPath = vscode.Uri.joinPath(
        workspaceFolder.uri,
        "..",
        "scripts",
        scriptName
      );
      
      try {
        await vscode.workspace.fs.stat(extensionScriptsPath);
        scriptPath = extensionScriptsPath;
        log(`[SO] Found script in extension scripts: ${scriptPath.fsPath}`);
      } catch {
        const msg = `Script not found: ${scriptName}\n\nSearched in:\n1. ${workspaceFolder.uri.fsPath}\\scripts\\${scriptName}\n2. ${workspaceFolder.uri.fsPath}\\..\\..\\scripts\\${scriptName}\n3. ${workspaceFolder.uri.fsPath}\\..\\scripts\\${scriptName}`;
        throw new Error(msg);
      }
    }
  }

  const execution = new vscode.ShellExecution("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath.fsPath,
    ...args
  ]);

  const task = new vscode.Task(
    { type: "shell", label },
    workspaceFolder,
    label,
    "SO Workspace",
    execution,
    []
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Dedicated,
    clear: true
  };

  log(`[SO] Executing: ${scriptPath.fsPath}`);
  await vscode.tasks.executeTask(task);
}

export function registerPaletteBuildCommands(context: vscode.ExtensionContext) {
  out.show(true);
  log("[SO] build_open_tasks.ts loaded");

  // Global task lifecycle logging
  context.subscriptions.push(
    vscode.tasks.onDidStartTask((e) => {
      log(`[SO] ✓ TASK STARTED: ${e.execution.task.name}`);
    }),
    vscode.tasks.onDidEndTaskProcess((e) => {
      log(`[SO] ✓ TASK ENDED: ${e.execution.task.name} (exit code: ${e.exitCode})`);
      if (e.exitCode === 0) {
        vscode.window.showInformationMessage(`✓ ${e.execution.task.name} completed successfully`);
      } else {
        vscode.window.showErrorMessage(`✗ ${e.execution.task.name} failed (exit code: ${e.exitCode})`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.exportPdfNpm", async () => {
      vscode.window.showInformationMessage("Starting: Export PDF");
      try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("No workspace folder open");
        }

        // Find the tools/so-vsix directory
        const soVsixPath = vscode.Uri.joinPath(workspaceFolder.uri, "tools", "so-vsix");
        
        log(`[SO] Running npm export:pdf in: ${soVsixPath.fsPath}`);

        const execution = new vscode.ShellExecution("npm", ["run", "export:pdf"], {
          cwd: soVsixPath.fsPath
        });

        const task = new vscode.Task(
          { type: "shell", label: "SO: Export PDF" },
          workspaceFolder,
          "SO: Export PDF",
          "SO Workspace",
          execution,
          []
        );

        task.presentationOptions = {
          reveal: vscode.TaskRevealKind.Always,
          panel: vscode.TaskPanelKind.Dedicated,
          clear: true
        };

        await vscode.tasks.executeTask(task);
      } catch (err: any) {
        log(`[SO] ERROR exportPdf: ${err.message}`);
        vscode.window.showErrorMessage(`Export PDF failed:\n${err.message}`);
      }
    }),

    vscode.commands.registerCommand("so-workspace.openGeneratedPdf", async () => {
      log("[SO] Command: openGeneratedPdf invoked");
      try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("No workspace folder open");
        }

        // PDF is at repo root: ../../docs/build/pdf/Full_Doc.pdf
        const pdfPath = vscode.Uri.joinPath(
          workspaceFolder.uri,
          "..",
          "..",
          "docs",
          "build",
          "pdf",
          "Full_Doc.pdf"
        );

        log(`[SO] Looking for PDF at: ${pdfPath.fsPath}`);

        try {
          await vscode.workspace.fs.stat(pdfPath);
          await vscode.env.openExternal(pdfPath);
          vscode.window.showInformationMessage("PDF opened successfully");
        } catch {
          vscode.window.showErrorMessage(`PDF not found at:\n${pdfPath.fsPath}\n\nRun "SO: Export PDF" first.`);
        }
      } catch (err: any) {
        log(`[SO] ERROR openGeneratedPdf: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to open PDF:\n${err.message}`);
      }
    })
  );
}