import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { MermaidSyntaxRepairer } from "../mermaid-syntax-repairer";
import { ConfigurationManager } from "../configuration-manager";

/**
 * Command handler for "SO: Fix Mermaid Diagram Syntax"
 * Scans for all .mmd files and repairs missing diagram type declarations
 */
export async function repairMermaidDiagramsCommand(configManager: ConfigurationManager): Promise<void> {
  try {
    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Get source directory from config
    const config = configManager.getConfiguration();
    const sourceDirectory = config.rendering.sourceDirectory || "docs/03_architecture/diagrams/src";
    const sourceDir = path.join(workspaceRoot, sourceDirectory);

    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      vscode.window.showWarningMessage(
        `Source directory not found: ${sourceDirectory}. No Mermaid files to repair.`
      );
      return;
    }

    // Scan for all .mmd files
    const mmdFiles = await scanForMermaidFiles(sourceDir);

    if (mmdFiles.length === 0) {
      vscode.window.showInformationMessage(
        `No Mermaid (.mmd) files found in ${sourceDirectory}`
      );
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Repairing Mermaid Diagrams",
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: `Found ${mmdFiles.length} Mermaid file(s)...` });

        // Create MermaidSyntaxRepairer instance
        const repairer = new MermaidSyntaxRepairer();

        // Convert file paths to URIs
        const fileUris = mmdFiles.map(filePath => vscode.Uri.file(filePath));

        // Call repairMultiple() method
        progress.report({ message: "Analyzing and repairing files..." });
        const results = await repairer.repairMultiple(fileUris);

        // Get summary
        const summary = repairer.getSummary(results);

        // Display summary with results
        const message = `Mermaid Repair Complete:\n` +
          `  Total files: ${summary.total}\n` +
          `  Fixed: ${summary.repaired}\n` +
          `  Already valid: ${summary.alreadyValid}\n` +
          `  Requires manual intervention: ${summary.requiresManual}\n` +
          `  Failed: ${summary.failed}`;

        console.log(message);

        // Show detailed list of files requiring manual intervention
        const manualFiles = results.filter(r => 
          !r.repaired && r.inferredType && r.confidence === 'low'
        );

        const failedFiles = results.filter(r => 
          r.error !== null && r.confidence !== 'low'
        );

        if (summary.requiresManual > 0 || summary.failed > 0) {
          // Show warning with details
          let detailMessage = message;

          if (manualFiles.length > 0) {
            detailMessage += '\n\nFiles requiring manual intervention:';
            manualFiles.forEach(r => {
              detailMessage += `\n  - ${path.relative(workspaceRoot, r.filePath)} (inferred: ${r.inferredType}, confidence: ${r.confidence})`;
            });
          }

          if (failedFiles.length > 0) {
            detailMessage += '\n\nFailed files:';
            failedFiles.forEach(r => {
              detailMessage += `\n  - ${path.relative(workspaceRoot, r.filePath)}: ${r.error}`;
            });
          }

          // Show in output channel for better formatting
          const outputChannel = vscode.window.createOutputChannel('Mermaid Repair');
          outputChannel.appendLine(detailMessage);
          outputChannel.show();

          vscode.window.showWarningMessage(
            `Mermaid repair completed with ${summary.requiresManual + summary.failed} file(s) requiring attention. See output for details.`
          );
        } else {
          vscode.window.showInformationMessage(
            `Mermaid repair completed successfully! Fixed ${summary.repaired} file(s), ${summary.alreadyValid} already valid.`
          );
        }
      }
    );

  } catch (error) {
    console.error('Failed to repair Mermaid diagrams:', error);
    vscode.window.showErrorMessage(
      `Failed to repair Mermaid diagrams: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Recursively scans a directory for .mmd files
 * @param rootPath - Root directory to scan
 * @returns Array of absolute file paths
 */
async function scanForMermaidFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];

  async function scanRecursive(currentPath: string): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanRecursive(fullPath);
      } else if (entry.isFile()) {
        // Check if file has .mmd extension
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.mmd') {
          results.push(fullPath);
        }
      }
    }
  }

  await scanRecursive(rootPath);
  return results;
}
