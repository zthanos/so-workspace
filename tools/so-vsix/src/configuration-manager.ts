/**
 * Configuration Manager
 * 
 * Central configuration management service that handles loading, merging,
 * and dynamic reloading of workspace configuration.
 * 
 * Manages the complete configuration lifecycle:
 * - Initial loading on extension activation
 * - File system watching for dynamic updates
 * - Configuration merging with precedence rules
 * - Error handling and user notifications
 * 
 * Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4
 */

import * as vscode from "vscode";
import * as path from "path";
import { ConfigLoader } from "./config-loader";
import { ConfigMerger } from "./config-merger";
import { ResolvedConfig } from "./config-types";

/**
 * Central configuration management service
 * 
 * Singleton service that manages workspace configuration throughout
 * the extension lifecycle. Provides configuration to command handlers
 * and automatically reloads when configuration files change.
 */
export class ConfigurationManager {
  private configLoader: ConfigLoader;
  private configMerger: ConfigMerger;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private currentConfig: ResolvedConfig | null = null;

  constructor() {
    this.configLoader = new ConfigLoader();
    this.configMerger = new ConfigMerger();
  }

  /**
   * Initialize configuration manager
   * 
   * Loads initial configuration and sets up file system watcher
   * for dynamic reloading when configuration files change.
   * 
   * @param context - Extension context for managing disposables
   * 
   * Requirements:
   * - 1.1: Check for configuration file on extension activation
   * - 4.1: Detect configuration file modifications
   * - 4.2: Reload configuration when changes detected
   * - 4.3: Notify active backends of configuration changes
   */
  async initialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      // Load initial configuration (Requirement 1.1)
      await this.reloadConfiguration();

      // Set up file watcher for dynamic reloading (Requirement 4.1)
      this.setupFileWatcher(context);

      console.log("Configuration Manager initialized successfully");
    } catch (error) {
      // Handle initialization errors (Requirement 6.4)
      this.handleError("Failed to initialize Configuration Manager", error);
      throw error;
    }
  }

  /**
   * Get current resolved configuration
   * 
   * Returns the current configuration after merging all sources.
   * Throws error if configuration has not been initialized.
   * 
   * @returns Current resolved configuration
   * @throws Error if configuration not initialized
   * 
   * Requirements:
   * - 4.4: Provide configuration to command handlers
   */
  getConfiguration(): ResolvedConfig {
    if (!this.currentConfig) {
      throw new Error("Configuration not initialized. Call initialize() first.");
    }
    return this.currentConfig;
  }

  /**
   * Reload configuration from all sources
   * 
   * Loads workspace configuration file, merges with VS Code settings,
   * and updates the current configuration. Handles errors gracefully
   * by falling back to VS Code settings and defaults.
   * 
   * @returns Promise that resolves when configuration is reloaded
   * 
   * Requirements:
   * - 4.2: Reload configuration when changes detected
   * - 4.3: Apply new settings for subsequent operations
   * - 6.1: Handle configuration loading errors
   * - 6.4: Log detailed diagnostic information
   */
  async reloadConfiguration(): Promise<void> {
    try {
      console.log("Reloading configuration...");

      // Load workspace config (Requirement 4.2)
      const workspaceConfig = await this.configLoader.loadWorkspaceConfig();

      // Get VS Code settings
      const vscodeConfig = vscode.workspace.getConfiguration("so-workspace");

      // Merge configurations (Requirement 4.3)
      this.currentConfig = this.configMerger.mergeConfigurations(
        workspaceConfig,
        vscodeConfig
      );

      console.log("Configuration reloaded successfully:", this.currentConfig);
    } catch (error) {
      // Handle reload errors (Requirement 6.1, 6.4)
      this.handleError("Failed to reload configuration", error);
      throw error;
    }
  }

  /**
   * Set up file system watcher
   * 
   * Creates a file watcher for the workspace configuration file.
   * Triggers configuration reload when file is created, modified, or deleted.
   * 
   * @param context - Extension context for managing disposables
   * 
   * Requirements:
   * - 4.1: Detect configuration file modifications
   * - 4.2: Reload configuration when changes detected
   * - 4.5: Display notification on successful reload
   */
  private setupFileWatcher(context: vscode.ExtensionContext): void {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceRoot) {
      console.warn("No workspace folder found, file watcher not created");
      return;
    }

    // Create file watcher for workspace config file (Requirement 4.1)
    const configPath = path.join(workspaceRoot, ".vscode", "so-workspace.config.json");
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(configPath);

    // Handle file change events (Requirement 4.2)
    this.fileWatcher.onDidChange(() => this.onConfigFileChanged());
    this.fileWatcher.onDidCreate(() => this.onConfigFileChanged());
    this.fileWatcher.onDidDelete(() => this.onConfigFileChanged());

    // Register for cleanup
    context.subscriptions.push(this.fileWatcher);

    console.log(`File watcher created for: ${configPath}`);
  }

  /**
   * Handle configuration file changes
   * 
   * Called when the workspace configuration file is created, modified, or deleted.
   * Reloads configuration and displays notification to user.
   * 
   * Requirements:
   * - 4.2: Reload configuration when changes detected
   * - 4.5: Display notification on successful reload
   * - 6.1: Handle configuration loading errors
   * - 6.2: Display user-friendly error messages
   */
  private async onConfigFileChanged(): Promise<void> {
    try {
      console.log("Configuration file changed, reloading...");

      // Reload configuration (Requirement 4.2)
      await this.reloadConfiguration();

      // Display success notification (Requirement 4.5)
      vscode.window.showInformationMessage(
        "Workspace configuration reloaded successfully"
      );
    } catch (error) {
      // Handle reload errors (Requirement 6.1, 6.2)
      this.handleError("Failed to reload configuration after file change", error);
      
      vscode.window.showErrorMessage(
        `Failed to reload configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle errors with detailed logging
   * 
   * Logs detailed diagnostic information for troubleshooting.
   * Provides context about the operation that failed.
   * 
   * @param message - Context message describing the operation
   * @param error - The error that occurred
   * 
   * Requirements:
   * - 6.4: Log detailed diagnostic information
   */
  private handleError(message: string, error: unknown): void {
    console.error(message, error);
    
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
  }

  /**
   * Cleanup resources
   * 
   * Disposes file watcher and cleans up resources.
   * Called when extension is deactivated.
   */
  dispose(): void {
    this.fileWatcher?.dispose();
    console.log("Configuration Manager disposed");
  }
}
