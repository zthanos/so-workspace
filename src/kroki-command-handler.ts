/**
 * Kroki Command Handler
 * 
 * Registers and handles the "Render Diagrams (Kroki)" VS Code command.
 * Uses the Kroki cloud service backend for diagram rendering without local dependencies.
 */

import * as vscode from "vscode";
import { KrokiRenderBackend, KrokiBackendConfig } from "./kroki-backend";
import {
  RendererOrchestratorImpl,
  ProgressReporterImpl,
  DiagramRenderConfig,
} from "./diagram_renderer_v2";
import { ConfigurationManager } from "./configuration-manager";
import { StructurizrRenderer } from "./structurizr-renderer";

/**
 * Kroki Command Handler
 * Handles the "so-workspace.renderDiagramsKroki" command
 */
export class KrokiCommandHandler {
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
   * Register the Kroki rendering command with VS Code
   * @param context - VS Code extension context
   */
  register(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
      "so-workspace.renderDiagramsKroki",
      () => this.execute()
    );

    context.subscriptions.push(disposable);
  }

  /**
   * Execute the Kroki rendering command
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

      // Read Kroki backend configuration from Configuration Manager
      const backendConfig = this.readKrokiBackendConfig();

      // Create Kroki backend instance
      const backend = new KrokiRenderBackend(backendConfig);

      // Read general rendering configuration
      const renderConfig = this.readRenderConfig();

      // Create progress reporter
      const progressReporter = new ProgressReporterImpl();

      // Create Structurizr renderer
      const structurizrRenderer = new StructurizrRenderer();

      // Create Structurizr validator
      const { StructurizrValidator } = await import("./structurizr-validator");
      const structurizrValidator = new StructurizrValidator();

      // Create orchestrator with Kroki backend and Structurizr renderer
      const orchestrator = new RendererOrchestratorImpl(
        backend,
        undefined, // Use default file scanner
        undefined, // Use default output manager
        progressReporter,
        structurizrRenderer,
        structurizrValidator
      );

      // Execute rendering with progress UI
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Rendering Diagrams (Kroki)",
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
              `Kroki diagram rendering failed: ${errorMessage}`
            );
          }
        }
      );
    } catch (error) {
      // Handle any unexpected errors at the top level
      const errorMessage = error instanceof Error ? error.message : String(error);

      vscode.window.showErrorMessage(
        `Unexpected error during Kroki diagram rendering: ${errorMessage}`
      );

      console.error("Kroki diagram rendering error:", error);
    } finally {
      // Always clear the rendering flag
      this.isRendering = false;
    }
  }

  /**
   * Read Kroki backend configuration from Configuration Manager
   * @returns Kroki backend configuration
   */
  private readKrokiBackendConfig(): KrokiBackendConfig {
    // Get resolved configuration from Configuration Manager
    const resolvedConfig = this.configManager.getConfiguration();

    // Map resolved Kroki config to backend config format
    return {
      krokiUrl: resolvedConfig.kroki.url,
      maxConcurrent: resolvedConfig.kroki.maxConcurrent,
      timeout: resolvedConfig.kroki.timeout,
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
