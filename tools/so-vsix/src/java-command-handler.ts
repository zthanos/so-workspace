/**
 * Java Command Handler
 * 
 * Registers and handles the "Render Diagrams (Java)" VS Code command.
 * Uses the Java backend for local diagram rendering with PlantUML JAR and Mermaid CLI.
 */

import * as vscode from "vscode";
import * as path from "path";
import { JavaRenderBackend, JavaBackendConfig } from "./java-backend";
import {
  RendererOrchestratorImpl,
  ProgressReporterImpl,
  DiagramRenderConfig,
} from "./diagram_renderer_v2";
import { ConfigurationManager } from "./configuration-manager";

/**
 * Java Command Handler
 * Handles the "so-workspace.renderDiagramsJava" command
 */
export class JavaCommandHandler {
  /** Configuration manager for accessing resolved configuration */
  private configManager: ConfigurationManager;
  
  /** Flag to prevent concurrent rendering operations */
  private isRendering: boolean = false;

  /**
   * Constructor
   * @param configManager - Configuration manager instance
   */
  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager;
  }

  /**
   * Register the Java rendering command with VS Code
   * @param context - VS Code extension context
   */
  register(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
      "so-workspace.renderDiagramsJava",
      () => this.execute()
    );

    context.subscriptions.push(disposable);
  }

  /**
   * Execute the Java rendering command
   * Reads configuration, creates backend, and executes rendering with progress UI
   */
  async execute(): Promise<void> {
    // Prevent concurrent executions
    if (this.isRendering) {
      vscode.window.showWarningMessage(
        "Diagram rendering is already in progress. Please wait for it to complete."
      );
      return;
    }

    try {
      // Set rendering flag
      this.isRendering = true;

      // Validate workspace
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage(
          "No workspace folder found. Please open a workspace to render diagrams."
        );
        return;
      }

      // Read Java backend configuration from Configuration Manager
      const backendConfig = this.readJavaBackendConfig(workspaceFolder.uri.fsPath);

      // Create Java backend instance
      const backend = new JavaRenderBackend(backendConfig);

      // Read general rendering configuration
      const renderConfig = this.readRenderConfig();

      // Create progress reporter
      const progressReporter = new ProgressReporterImpl();

      // Create orchestrator with Java backend
      const orchestrator = new RendererOrchestratorImpl(
        backend,
        undefined, // Use default file scanner
        undefined, // Use default output manager
        progressReporter
      );

      // Execute rendering with progress UI
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Rendering Diagrams (Java)",
          cancellable: false,
        },
        async (progress) => {
          // Set progress callback for the reporter
          progressReporter.setProgressCallback(progress.report.bind(progress));

          // Execute rendering through orchestrator
          try {
            await orchestrator.render(renderConfig);
          } catch (error) {
            // Handle top-level errors
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            progressReporter.error(errorMessage);

            vscode.window.showErrorMessage(
              `Java diagram rendering failed: ${errorMessage}`
            );
          }
        }
      );
    } catch (error) {
      // Handle any unexpected errors at the top level
      const errorMessage = error instanceof Error ? error.message : String(error);

      vscode.window.showErrorMessage(
        `Unexpected error during Java diagram rendering: ${errorMessage}`
      );

      console.error("Java diagram rendering error:", error);
    } finally {
      // Always clear the rendering flag
      this.isRendering = false;
    }
  }

  /**
   * Read Java backend configuration from Configuration Manager
   * @param workspaceRoot - Workspace root path for resolving relative paths
   * @returns Java backend configuration
   */
  private readJavaBackendConfig(workspaceRoot: string): JavaBackendConfig {
    // Get resolved configuration from Configuration Manager
    const resolvedConfig = this.configManager.getConfiguration();

    // Resolve PlantUML JAR path (relative to workspace root or absolute)
    const plantUmlJarPath = resolvedConfig.java.plantUmlJarPath;
    const absolutePlantUmlJarPath = path.isAbsolute(plantUmlJarPath)
      ? plantUmlJarPath
      : path.join(workspaceRoot, plantUmlJarPath);

    // Map resolved Java config to backend config format
    return {
      plantUmlJarPath: absolutePlantUmlJarPath,
      mermaidCliPath: resolvedConfig.java.mermaidCliPath,
      javaPath: resolvedConfig.java.javaPath,
      maxConcurrent: 5, // Use default for now, can be added to config later
    };
  }

  /**
   * Read general rendering configuration from Configuration Manager
   * @returns Diagram render configuration
   */
  private readRenderConfig(): DiagramRenderConfig {
    // Get resolved configuration from Configuration Manager
    const resolvedConfig = this.configManager.getConfiguration();

    return {
      sourceDirectory: resolvedConfig.rendering.sourceDirectory,
      outputDirectory: resolvedConfig.rendering.outputDirectory,
      plantUmlServerUrl: resolvedConfig.plantuml.url,
      concurrencyLimit: resolvedConfig.rendering.concurrencyLimit,
      includeCache: new Map<string, string>(),
    };
  }
}
