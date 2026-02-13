import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { WorkspaceConfig } from "./config-types";

/**
 * Output channel for logging configuration generation operations.
 */
let outputChannel: vscode.OutputChannel;

/**
 * Default configuration template with all available settings.
 * Includes sensible default values and inline documentation.
 */
function getDefaultConfigTemplate(): WorkspaceConfig {
  return {
    version: "1.0",
    activeEnvironment: "default",
    
    endpoints: {
      plantuml: {
        url: "https://www.plantuml.com/plantuml",
        timeout: 30000,
        enabled: true
      },
      java: {
        plantUmlJarPath: "tools/plantuml/plantuml-1.2026.1.jar",
        mermaidCliPath: "mmdc",
        javaPath: "java",
        enabled: true
      },
      structurizr: {
        structurizrCliPath: "structurizr-cli",
        structurizrServerUrl: "http://localhost:8080",
        validateBeforeRender: false,
        enabled: true
      },
      rendering: {
        sourceDirectory: "docs/03_architecture/diagrams/src",
        outputDirectory: "docs/03_architecture/diagrams/out",
        concurrencyLimit: 5
      }
    },
    
    environments: {
      development: {
        plantuml: {
          url: "http://localhost:8080/plantuml",
          timeout: 60000,
          enabled: true
        }
      },
      staging: {
        plantuml: {
          url: "https://plantuml-staging.example.com",
          timeout: 45000,
          enabled: true
        }
      },
      production: {
        plantuml: {
          url: "https://plantuml.example.com",
          timeout: 30000,
          enabled: true
        }
      }
    }
  };
}

/**
 * Generates a formatted JSON string with comments explaining each setting.
 * Since JSON doesn't support comments, we add them as a separate documentation string.
 */
function formatConfigWithDocumentation(config: WorkspaceConfig): string {
  const documentation = `// SO Workspace Configuration File
// This file configures external service endpoints for diagram rendering
// 
// Configuration precedence: environment config > workspace config > VS Code settings > defaults
//
// Fields:
// - version: Schema version for future compatibility
// - activeEnvironment: Name of the active environment (references environments section)
// - endpoints: Default endpoint configurations
//   - plantuml: PlantUML server configuration
//     - url: Server URL (default: https://www.plantuml.com/plantuml)
//     - timeout: Request timeout in milliseconds (default: 30000)
//     - enabled: Whether this endpoint is enabled (default: true)
//   - java: Java backend configuration for local rendering
//     - plantUmlJarPath: Path to PlantUML JAR file (relative to workspace root)
//     - mermaidCliPath: Path to Mermaid CLI executable (default: mmdc)
//     - javaPath: Java executable path (default: java)
//     - enabled: Whether this backend is enabled (default: true)
//   - structurizr: Structurizr backend configuration
//     - structurizrCliPath: Path to Structurizr CLI executable (default: structurizr-cli)
//     - structurizrServerUrl: Structurizr server URL for validation (default: http://localhost:8080)
//     - validateBeforeRender: Whether to validate DSL files before rendering (default: false)
//     - enabled: Whether this backend is enabled (default: true)
//   - rendering: General rendering settings
//     - sourceDirectory: Source directory for diagram files (relative to workspace root)
//     - outputDirectory: Output directory for rendered diagrams (relative to workspace root)
//     - concurrencyLimit: Maximum concurrent rendering operations (default: 5)
// - environments: Environment-specific configurations
//   - Each environment can override default endpoint settings
//   - Switch environments using "SO: Switch Endpoint Environment" command

`;

  const jsonString = JSON.stringify(config, null, 2);
  
  return documentation + jsonString;
}

/**
 * Checks if the configuration file already exists.
 * 
 * @param configPath - Full path to the configuration file
 * @returns true if file exists, false otherwise
 */
async function configFileExists(configPath: string): Promise<boolean> {
  try {
    await fs.access(configPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Prompts user for confirmation before overwriting existing file.
 * 
 * @returns true to proceed with overwrite, false to cancel
 */
async function promptOverwrite(): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    "Configuration file already exists. Overwrite?",
    { modal: true },
    "Overwrite",
    "Cancel"
  );
  
  return choice === "Overwrite";
}

/**
 * Creates the .vscode directory if it doesn't exist.
 * 
 * @param vscodeDir - Path to the .vscode directory
 */
async function ensureVscodeDirectory(vscodeDir: string): Promise<void> {
  try {
    await fs.mkdir(vscodeDir, { recursive: true });
    outputChannel.appendLine(`[INFO] .vscode directory created/verified: ${vscodeDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to create .vscode directory: ${errorMessage}`);
    throw new Error(`Cannot create .vscode directory: ${errorMessage}`);
  }
}

/**
 * Writes the configuration file with formatted JSON.
 * 
 * @param configPath - Full path to the configuration file
 * @param content - Configuration content to write
 */
async function writeConfigFile(configPath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(configPath, content, "utf-8");
    outputChannel.appendLine(`[INFO] Configuration file written: ${configPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to write configuration file: ${errorMessage}`);
    throw new Error(`Cannot write configuration file: ${errorMessage}`);
  }
}

/**
 * Offers to open the generated configuration file in the editor.
 * 
 * @param configPath - Path to the configuration file
 */
async function offerToOpenFile(configPath: string): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `Configuration file created at ${path.basename(configPath)}`,
    "Open File"
  );
  
  if (choice === "Open File") {
    try {
      const document = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(document);
      outputChannel.appendLine(`[INFO] Opened configuration file in editor`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[ERROR] Failed to open file: ${errorMessage}`);
      vscode.window.showErrorMessage(`Failed to open file: ${errorMessage}`);
    }
  }
}

/**
 * Main command handler for generating workspace configuration file.
 * Implements the "SO: Generate Workspace Config" command.
 */
async function generateWorkspaceConfig(): Promise<void> {
  outputChannel.appendLine("[INFO] ========================================");
  outputChannel.appendLine("[INFO] Generate Workspace Config started");
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
    const vscodeDir = path.join(workspaceRoot, ".vscode");
    const configPath = path.join(vscodeDir, "so-workspace.config.json");
    
    outputChannel.appendLine(`[INFO] Workspace root: ${workspaceRoot}`);
    outputChannel.appendLine(`[INFO] Config path: ${configPath}`);
    
    // Check if configuration file already exists
    const exists = await configFileExists(configPath);
    if (exists) {
      outputChannel.appendLine(`[INFO] Configuration file already exists`);
      const shouldOverwrite = await promptOverwrite();
      if (!shouldOverwrite) {
        outputChannel.appendLine(`[INFO] User cancelled overwrite`);
        outputChannel.appendLine("[INFO] ========================================");
        return;
      }
      outputChannel.appendLine(`[INFO] User confirmed overwrite`);
    }
    
    // Create .vscode directory if it doesn't exist
    await ensureVscodeDirectory(vscodeDir);
    
    // Generate default configuration template
    const config = getDefaultConfigTemplate();
    const content = formatConfigWithDocumentation(config);
    
    // Write configuration file
    await writeConfigFile(configPath, content);
    
    outputChannel.appendLine("[INFO] ========================================");
    outputChannel.appendLine("[INFO] Configuration file generated successfully");
    outputChannel.appendLine("[INFO] ========================================");
    
    // Offer to open the file
    await offerToOpenFile(configPath);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to generate configuration: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    outputChannel.appendLine("[INFO] ========================================");
    vscode.window.showErrorMessage(`Failed to generate configuration: ${errorMessage}`);
  }
}

/**
 * Registers the generate workspace config command with VS Code.
 * This function should be called from the extension's activate() function.
 * 
 * @param context - The VS Code extension context for managing subscriptions
 */
export function registerGenerateConfigCommand(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel("SO Workspace - Config Generation");
  
  // Register the command
  const disposable = vscode.commands.registerCommand(
    "so-workspace.generateWorkspaceConfig",
    generateWorkspaceConfig
  );
  
  // Add to subscriptions for proper cleanup
  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine("[INFO] Generate Workspace Config command registered");
}
