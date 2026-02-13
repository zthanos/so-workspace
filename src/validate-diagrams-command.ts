/**
 * Validate Diagrams Command
 * 
 * VSCode command for validating Structurizr DSL files against a Structurizr server.
 * Provides validation feedback through output channel and notifications.
 * 
 * Features:
 * - Validates all .dsl files in workspace
 * - Validates currently open .dsl file
 * - Displays detailed error messages with line numbers
 * - Shows success notification when all files valid
 * - Handles server unavailable gracefully
 * 
 * Requirements: 13.1, 13.3, 13.4, 13.9, 13.10
 */

import * as vscode from "vscode";
import * as path from "path";
import { StructurizrCliValidator, ValidationResult } from "./structurizr-cli-validator";
import { FileScannerImpl } from "./diagram_renderer_v2";

/**
 * Register the validate diagrams command
 * 
 * Registers the "so-workspace.validateDiagrams" command with VSCode.
 * The command can be invoked from the command palette or programmatically.
 * 
 * @param context - Extension context for managing disposables
 * 
 * Requirements:
 * - 13.1: Provide validation command separate from render command
 */
export function registerValidateDiagramsCommand(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand(
    "so-workspace.validateDiagrams",
    async () => {
      await executeValidateDiagrams();
    }
  );

  context.subscriptions.push(command);
  console.log("Validate Diagrams command registered");
}

/**
 * Execute the validate diagrams command
 * 
 * Main entry point for the validation command.
 * Determines whether to validate all files or just the active file.
 * 
 * Requirements:
 * - 13.9: Allow validation of individual .dsl files or all .dsl files
 */
async function executeValidateDiagrams(): Promise<void> {
  try {
    // Get workspace root
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    // Get CLI configuration from settings
    const config = getCliConfig(workspaceRoot);

    // Create output channel for validation results
    const outputChannel = vscode.window.createOutputChannel("Structurizr DSL Validation");
    outputChannel.show(true);

    // Check if there's an active .dsl file
    const activeEditor = vscode.window.activeTextEditor;
    const activeDslFile = activeEditor?.document.fileName.endsWith(".dsl")
      ? activeEditor.document.fileName
      : null;

    // Determine validation scope
    let dslFiles: string[];
    if (activeDslFile) {
      // Validate only the active file
      outputChannel.appendLine(`Validating active file: ${path.basename(activeDslFile)}`);
      outputChannel.appendLine(`Using: Structurizr CLI (Docker container: ${config.containerName})`);
      outputChannel.appendLine("─".repeat(80));
      dslFiles = [activeDslFile];
    } else {
      // Validate all .dsl files in workspace
      outputChannel.appendLine("Scanning workspace for .dsl files...");
      outputChannel.appendLine(`Using: Structurizr CLI (Docker container: ${config.containerName})`);
      outputChannel.appendLine("─".repeat(80));
      dslFiles = await scanForDslFiles(workspaceRoot);

      if (dslFiles.length === 0) {
        outputChannel.appendLine("No .dsl files found in workspace");
        vscode.window.showInformationMessage("No Structurizr DSL files found in workspace");
        return;
      }

      outputChannel.appendLine(`Found ${dslFiles.length} .dsl file(s)`);
      outputChannel.appendLine("");
    }

    // Validate files
    await validateFiles(dslFiles, config, outputChannel);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Validation failed: ${message}`);
    console.error("Validation error:", error);
  }
}

/**
 * Scan workspace for .dsl files
 * 
 * Uses the file scanner to discover all .dsl files in the workspace.
 * 
 * @param workspaceRoot - Root directory of the workspace
 * @returns Array of absolute paths to .dsl files
 * 
 * Requirements:
 * - 13.9: Scan for .dsl files in workspace
 */
async function scanForDslFiles(workspaceRoot: string): Promise<string[]> {
  const scanner = new FileScannerImpl();
  
  // Scan the entire workspace for .dsl files
  const diagramFiles = await scanner.scanDirectory(workspaceRoot, [".dsl"]);
  
  // Extract absolute paths
  return diagramFiles.map(file => file.absolutePath);
}

/**
 * Validate multiple DSL files
 * 
 * Validates each file and displays results in the output channel.
 * Shows notifications for success or failure.
 * 
 * @param dslFiles - Array of .dsl file paths to validate
 * @param config - CLI validator configuration
 * @param outputChannel - Output channel for displaying results
 * 
 * Requirements:
 * - 13.3: Display detailed error messages with line numbers
 * - 13.4: Show success notification when all files valid
 * - 13.10: Report results for each file separately
 */
async function validateFiles(
  dslFiles: string[],
  config: { containerName: string; cliPath: string; workspaceRoot: string },
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const validator = new StructurizrCliValidator(config);
  
  // Validate all files
  const results = await validator.validateAll(dslFiles);
  
  // Display results for each file (Requirement 13.10)
  let allValid = true;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    displayValidationResult(result, outputChannel);
    
    if (!result.valid) {
      allValid = false;
    }
    
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  // Display summary
  outputChannel.appendLine("");
  outputChannel.appendLine("═".repeat(80));
  outputChannel.appendLine("VALIDATION SUMMARY");
  outputChannel.appendLine("═".repeat(80));
  outputChannel.appendLine(`Total files: ${results.length}`);
  outputChannel.appendLine(`Valid files: ${results.filter(r => r.valid).length}`);
  outputChannel.appendLine(`Invalid files: ${results.filter(r => !r.valid).length}`);
  outputChannel.appendLine(`Total errors: ${totalErrors}`);
  outputChannel.appendLine(`Total warnings: ${totalWarnings}`);

  // Show notification (Requirements 13.3, 13.4)
  if (allValid) {
    // Success notification (Requirement 13.4)
    vscode.window.showInformationMessage(
      `✓ All ${results.length} DSL file(s) validated successfully`
    );
  } else {
    // Error notification (Requirement 13.3)
    const invalidCount = results.filter(r => !r.valid).length;
    vscode.window.showErrorMessage(
      `✗ Validation failed: ${invalidCount} file(s) with errors. See output for details.`
    );
  }
}

/**
 * Display validation result for a single file
 * 
 * Formats and displays the validation result in the output channel.
 * Shows file path, validation status, and any errors or warnings.
 * 
 * @param result - Validation result for a single file
 * @param outputChannel - Output channel for displaying results
 * 
 * Requirements:
 * - 13.3: Display detailed error messages with line numbers
 * - 13.8: Highlight specific DSL syntax issues
 */
function displayValidationResult(
  result: ValidationResult,
  outputChannel: vscode.OutputChannel
): void {
  const fileName = path.basename(result.filePath);
  const status = result.valid ? "✓ VALID" : "✗ INVALID";
  
  outputChannel.appendLine("");
  outputChannel.appendLine(`${status}: ${fileName}`);
  outputChannel.appendLine(`Path: ${result.filePath}`);
  
  // Display errors (Requirement 13.3, 13.8)
  if (result.errors.length > 0) {
    outputChannel.appendLine("");
    outputChannel.appendLine("Errors:");
    for (const error of result.errors) {
      if (error.line > 0) {
        outputChannel.appendLine(`  Line ${error.line}: ${error.message}`);
      } else {
        outputChannel.appendLine(`  ${error.message}`);
      }
    }
  }
  
  // Display warnings
  if (result.warnings.length > 0) {
    outputChannel.appendLine("");
    outputChannel.appendLine("Warnings:");
    for (const warning of result.warnings) {
      if (warning.line > 0) {
        outputChannel.appendLine(`  Line ${warning.line}: ${warning.message}`);
      } else {
        outputChannel.appendLine(`  ${warning.message}`);
      }
    }
  }
  
  outputChannel.appendLine("─".repeat(80));
}

/**
 * Get workspace root directory
 * 
 * Returns the first workspace folder's URI path.
 * 
 * @returns Workspace root path or null if no workspace is open
 */
function getWorkspaceRoot(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }
  return workspaceFolders[0].uri.fsPath;
}

/**
 * Get CLI configuration from settings
 * 
 * Reads the CLI configuration from VSCode settings.
 * Falls back to default values if not configured.
 * 
 * @param workspaceRoot - Workspace root path
 * @returns CLI configuration object
 */
function getCliConfig(workspaceRoot: string): { containerName: string; cliPath: string; workspaceRoot: string } {
  const config = vscode.workspace.getConfiguration("so-workspace");
  
  return {
    containerName: config.get<string>("diagrams.structurizrCliContainer") || "structurizr-cli",
    cliPath: config.get<string>("diagrams.structurizrCliPath") || "/usr/local/structurizr-cli/structurizr.sh",
    workspaceRoot: workspaceRoot,
  };
}
