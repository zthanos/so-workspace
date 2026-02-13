import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { WorkspaceConfig } from "./config-types";
import { ConfigurationManager } from "./configuration-manager";

/**
 * Output channel for logging environment switching operations.
 */
let outputChannel: vscode.OutputChannel;

/**
 * Configuration manager instance for triggering reloads.
 */
let configManager: ConfigurationManager | null = null;

/**
 * Reads the workspace configuration file.
 * 
 * @param configPath - Full path to the configuration file
 * @returns Parsed workspace configuration or null if file doesn't exist
 */
async function readWorkspaceConfig(configPath: string): Promise<WorkspaceConfig | null> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content) as WorkspaceConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Gets available environments from workspace configuration.
 * 
 * @param config - Workspace configuration object
 * @returns Array of environment names
 */
function getAvailableEnvironments(config: WorkspaceConfig): string[] {
  const environments: string[] = [];
  
  // Always include "default" environment
  environments.push("default");
  
  // Add custom environments if defined
  if (config.environments) {
    environments.push(...Object.keys(config.environments));
  }
  
  return environments;
}

/**
 * Shows quick pick menu with available environments.
 * 
 * @param environments - Array of available environment names
 * @param currentEnvironment - Currently active environment
 * @returns Selected environment name or undefined if cancelled
 * 
 * Requirements: 7.2, 7.3, 7.4
 */
async function showEnvironmentPicker(
  environments: string[],
  currentEnvironment: string
): Promise<string | undefined> {
  const items = environments.map(env => ({
    label: env,
    description: env === currentEnvironment ? "(current)" : undefined,
    picked: env === currentEnvironment
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select an environment",
    title: "Switch Endpoint Environment"
  });
  
  return selected?.label;
}

/**
 * Updates the activeEnvironment field in workspace config file.
 * 
 * @param configPath - Full path to the configuration file
 * @param config - Current workspace configuration
 * @param newEnvironment - New environment to activate
 * 
 * Requirements: 7.2, 7.3, 7.4
 */
async function updateActiveEnvironment(
  configPath: string,
  config: WorkspaceConfig,
  newEnvironment: string
): Promise<void> {
  // Update the activeEnvironment field
  config.activeEnvironment = newEnvironment;
  
  // Write back to file with formatting
  const content = JSON.stringify(config, null, 2);
  await fs.writeFile(configPath, content, "utf-8");
  
  outputChannel.appendLine(`[INFO] Updated activeEnvironment to: ${newEnvironment}`);
}

/**
 * Main command handler for switching endpoint environments.
 * Implements the "SO: Switch Endpoint Environment" command.
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
async function switchEndpointEnvironment(): Promise<void> {
  outputChannel.appendLine("[INFO] ========================================");
  outputChannel.appendLine("[INFO] Switch Endpoint Environment started");
  outputChannel.appendLine("[INFO] ========================================");
  
  try {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const errorMsg = "No workspace folder open. Please open a workspace to use this command.";
      outputChannel.appendLine(`[ERROR] ${errorMsg}`);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }
    
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const configPath = path.join(workspaceRoot, ".vscode", "so-workspace.config.json");
    
    outputChannel.appendLine(`[INFO] Workspace root: ${workspaceRoot}`);
    outputChannel.appendLine(`[INFO] Config path: ${configPath}`);
    
    // Read workspace configuration (Requirement 7.2)
    const config = await readWorkspaceConfig(configPath);
    
    if (!config) {
      const errorMsg = "No workspace configuration file found. Generate one using 'SO: Generate Workspace Config' command.";
      outputChannel.appendLine(`[ERROR] ${errorMsg}`);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }
    
    // Get available environments (Requirement 7.2)
    const environments = getAvailableEnvironments(config);
    const currentEnvironment = config.activeEnvironment || "default";
    
    outputChannel.appendLine(`[INFO] Available environments: ${environments.join(", ")}`);
    outputChannel.appendLine(`[INFO] Current environment: ${currentEnvironment}`);
    
    // Show quick pick menu (Requirement 7.3)
    const selectedEnvironment = await showEnvironmentPicker(environments, currentEnvironment);
    
    if (!selectedEnvironment) {
      outputChannel.appendLine(`[INFO] User cancelled environment selection`);
      outputChannel.appendLine("[INFO] ========================================");
      return;
    }
    
    if (selectedEnvironment === currentEnvironment) {
      outputChannel.appendLine(`[INFO] Selected environment is already active: ${selectedEnvironment}`);
      vscode.window.showInformationMessage(`Environment '${selectedEnvironment}' is already active`);
      outputChannel.appendLine("[INFO] ========================================");
      return;
    }
    
    outputChannel.appendLine(`[INFO] User selected environment: ${selectedEnvironment}`);
    
    // Update activeEnvironment in config file (Requirement 7.2, 7.3)
    await updateActiveEnvironment(configPath, config, selectedEnvironment);
    
    // Trigger configuration reload (Requirement 7.4)
    if (configManager) {
      await configManager.reloadConfiguration();
      outputChannel.appendLine(`[INFO] Configuration reloaded with new environment`);
    }
    
    // Display notification (Requirement 7.5)
    vscode.window.showInformationMessage(
      `Switched to '${selectedEnvironment}' environment`
    );
    
    outputChannel.appendLine("[INFO] ========================================");
    outputChannel.appendLine("[INFO] Environment switched successfully");
    outputChannel.appendLine("[INFO] ========================================");
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to switch environment: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    outputChannel.appendLine("[INFO] ========================================");
    vscode.window.showErrorMessage(`Failed to switch environment: ${errorMessage}`);
  }
}

/**
 * Registers the switch environment command with VS Code.
 * This function should be called from the extension's activate() function.
 * 
 * @param context - The VS Code extension context for managing subscriptions
 * @param manager - Configuration manager instance for triggering reloads
 */
export function registerSwitchEnvironmentCommand(
  context: vscode.ExtensionContext,
  manager: ConfigurationManager
): void {
  // Store configuration manager reference
  configManager = manager;
  
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel("SO Workspace - Environment Switching");
  
  // Register the command
  const disposable = vscode.commands.registerCommand(
    "so-workspace.switchEndpointEnvironment",
    switchEndpointEnvironment
  );
  
  // Add to subscriptions for proper cleanup
  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine("[INFO] Switch Endpoint Environment command registered");
}
