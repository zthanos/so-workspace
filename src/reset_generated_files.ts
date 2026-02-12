import * as vscode from "vscode";
import * as path from "path";

const out = vscode.window.createOutputChannel("SO Workspace");

function log(msg: string) {
  out.appendLine(msg);
}

/**
 * Recursively deletes all files in a directory while preserving the directory structure
 */
async function deleteFilesRecursively(uri: vscode.Uri): Promise<number> {
  let deletedCount = 0;

  try {
    const entries = await vscode.workspace.fs.readDirectory(uri);

    for (const [name, type] of entries) {
      const entryUri = vscode.Uri.joinPath(uri, name);

      if (type === vscode.FileType.Directory) {
        // Recursively delete files in subdirectories
        deletedCount += await deleteFilesRecursively(entryUri);
      } else if (type === vscode.FileType.File) {
        // Delete the file
        await vscode.workspace.fs.delete(entryUri);
        deletedCount++;
        log(`[SO] Deleted: ${entryUri.fsPath}`);
      }
    }
  } catch (err: any) {
    log(`[SO] Error reading directory ${uri.fsPath}: ${err.message}`);
  }

  return deletedCount;
}

/**
 * Command to reset all generated files in docs/reports/
 */
export async function resetGeneratedFiles(): Promise<void> {
  log("[SO] Command: resetGeneratedFiles invoked");

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("No workspace folder open");
    }

    // Prompt user for confirmation
    const confirmation = await vscode.window.showWarningMessage(
      "This will delete all generated report files in docs/reports/. Directory structure will be preserved. Continue?",
      { modal: true },
      "Yes, Delete All",
      "Cancel"
    );

    if (confirmation !== "Yes, Delete All") {
      log("[SO] Reset operation cancelled by user");
      vscode.window.showInformationMessage("Reset operation cancelled");
      return;
    }

    // Path to docs/reports/ directory
    const reportsPath = vscode.Uri.joinPath(workspaceFolder.uri, "docs", "reports");

    log(`[SO] Starting reset of generated files in: ${reportsPath.fsPath}`);

    // Check if the directory exists
    try {
      await vscode.workspace.fs.stat(reportsPath);
    } catch {
      vscode.window.showWarningMessage(`Directory not found: ${reportsPath.fsPath}`);
      log(`[SO] Directory not found: ${reportsPath.fsPath}`);
      return;
    }

    // Delete all files recursively while preserving directory structure
    const deletedCount = await deleteFilesRecursively(reportsPath);

    log(`[SO] Reset complete. Deleted ${deletedCount} file(s)`);
    vscode.window.showInformationMessage(
      `Reset complete. Deleted ${deletedCount} generated report file(s).`
    );
  } catch (err: any) {
    log(`[SO] ERROR resetGeneratedFiles: ${err.message}`);
    vscode.window.showErrorMessage(`Reset failed: ${err.message}`);
  }
}

/**
 * Register the reset command
 */
export function registerResetGeneratedFilesCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("so.resetGeneratedFiles", resetGeneratedFiles)
  );
  log("[SO] reset_generated_files.ts command registered");
}
