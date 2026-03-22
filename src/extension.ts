import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import {
  reqInventoryGenerateOpenChat, reqInventoryEvalOpenChat,
  reqInventoryUpdateOpenChat, reqInventoryPatchOpenChat, reqInventoryRecheckOpenChat,
  objectivesGenerateOpenChat, objectivesEvalOpenChat,
  objectivesUpdateOpenChat, objectivesPatchOpenChat, objectivesRecheckOpenChat,
  diagramGenerateC4ContextOpenChat, diagramGenerateC4ContainerOpenChat,
  diagramGenerateFlowOpenChat, diagramGenerateSequenceOpenChat, diagramGenerateStateOpenChat,
  diagramEvalOpenChat, diagramUpdateOpenChat, diagramPatchOpenChat, diagramRecheckOpenChat,
  solutionOutlineGenerateOpenChat, solutionOutlineEvalOpenChat,
  solutionOutlineUpdateOpenChat, solutionOutlinePatchOpenChat, solutionOutlineRecheckOpenChat,
  adrGenerateOpenChat, adrEvalOpenChat, adrUpdateOpenChat, adrPatchOpenChat, adrRecheckOpenChat,
} from "./skill_open_chat";
import { initializeSkillLoader } from "./skill-loader";
import { registerPaletteBuildCommands } from "./build_open_tasks";
import { CommandHandlerImpl } from "./diagram_renderer_v2";
import { registerWordToMarkdownCommand } from "./word_to_markdown";
import { registerPdfToMarkdownCommand } from "./pdf_to_markdown";
import { registerSoParticipant } from "./so_participant";
import { registerSwitchEnvironmentCommand } from "./switch-environment-command";
import { registerValidateDiagramsCommand } from "./validate-diagrams-command";
import { registerDocxExportCommand } from "./docx-exporter";
import { ConfigurationManager } from "./configuration-manager";
import { initializeWorkspaceCommand } from "./commands/initialize-workspace-command";
import { PanelManager } from "./diagram-previewer/panelManager";
import { readConfig, onConfigChange } from "./diagram-previewer/config";
import { initializeLogger, getLogger } from "./diagram-previewer/logger";

// Mermaid rendering uses bundled mermaid.esm.min.mjs — no mermaid-cli required

// Store command handler instances for cleanup
let configurationManager: ConfigurationManager | undefined;
let diagramPreviewerPanelManager: PanelManager | undefined;
let diagramPreviewerOutputChannel: vscode.OutputChannel | undefined;

/**
 * Log a message to the Diagram Previewer output channel
 * @param message - Message to log
 * @param level - Log level (info, warning, error)
 */
function logDiagramPreviewerMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!diagramPreviewerOutputChannel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'warning' ? '[WARN]' : '[INFO]';
  diagramPreviewerOutputChannel.appendLine(`${timestamp} ${prefix} ${message}`);
}

export async function activate(context: vscode.ExtensionContext) {
  // Create AssetResolver instance
  const assetResolver = new AssetResolver(context);

  // Initialize command handlers with AssetResolver
  initializeSkillLoader();

  // Workspace Initialization
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.initialize", () => initializeWorkspaceCommand(assetResolver)),
    vscode.commands.registerCommand("so-workspace.req.generate", reqInventoryGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.req.eval", reqInventoryEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.req.update", reqInventoryUpdateOpenChat),
    vscode.commands.registerCommand("so-workspace.req.patch", reqInventoryPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.req.recheck", reqInventoryRecheckOpenChat)
  );

  
  // Requirements context-menu commands (right-click on brd.md / requirements.inventory.md)
  context.subscriptions.push(
    vscode.commands.registerCommand("so.createRequirementsInventory", reqInventoryGenerateOpenChat),
    vscode.commands.registerCommand("so.evaluateRequirementsInventory", reqInventoryEvalOpenChat),
    vscode.commands.registerCommand("so.patchRequirementsInventory", reqInventoryPatchOpenChat),
    vscode.commands.registerCommand("so.showIntegrationRequirements", () =>
      vscode.commands.executeCommand("workbench.action.chat.open", {
        query: "@so What are the integration requirements?"
      })
    )
  );

  // Objectives
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.obj.generate", objectivesGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.eval", objectivesEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.update", objectivesUpdateOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.patch", objectivesPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.recheck", objectivesRecheckOpenChat)
  );

  // Diagrams (evaluate/patch per selected diagram)
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.diagram.generateC4Context", diagramGenerateC4ContextOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.generateC4Container", diagramGenerateC4ContainerOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.generateFlow", diagramGenerateFlowOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.generateSequence", diagramGenerateSequenceOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.generateState", diagramGenerateStateOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.eval", diagramEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.update", diagramUpdateOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.patch", diagramPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.recheck", diagramRecheckOpenChat)
  );

  // Solution Outline
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.so.generate", solutionOutlineGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.so.eval", solutionOutlineEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.so.update", solutionOutlineUpdateOpenChat),
    vscode.commands.registerCommand("so-workspace.so.patch", solutionOutlinePatchOpenChat),
    vscode.commands.registerCommand("so-workspace.so.finalReview", solutionOutlineRecheckOpenChat)
  );

  // ADRs
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.adr.generate", adrGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.adr.eval", adrEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.adr.update", adrUpdateOpenChat),
    vscode.commands.registerCommand("so-workspace.adr.patch", adrPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.adr.recheck", adrRecheckOpenChat)
  );

  // Diagram rendering with Java backend (V2 implementation)
  // Note: This uses the default orchestrator with local rendering backends
  const { RendererOrchestratorImpl, FileScannerImpl, OutputManagerImpl, ProgressReporterImpl } = require("./diagram_renderer_v2");
  const { JavaRenderBackend } = require("./java-backend");
  const { StructurizrPipelineRenderer } = require("./structurizr-pipeline-renderer");
  const { StructurizrValidator } = require("./structurizr-validator");

  // Initialize Configuration Manager first (needed for Structurizr backend config)
  configurationManager = new ConfigurationManager();
  await configurationManager.initialize(context).catch(error => {
    console.error("Failed to initialize Configuration Manager:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize workspace configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  });

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Read Kroki endpoint from diagram previewer config for Java backend
  const krokiEndpoint = readConfig().krokiEndpoint;

  // Create backend instance with configuration.
  // PlantUML and Mermaid render through the local Kroki endpoint.
  const javaBackend = new JavaRenderBackend({
    extensionContext: context,
    krokiEndpoint
  });

  const structurizrConfig = configurationManager.getConfiguration().structurizr;

  // Create Structurizr renderer backed by a dedicated Structurizr CLI runtime.
  // This provides higher quality SVG output via DSL → PlantUML → Kroki → SVG pipeline
  const structurizrRenderer = new StructurizrPipelineRenderer(
    workspaceRoot,
    structurizrConfig.structurizrCliPath,
    structurizrConfig.structurizrCliContainer
  );
  const structurizrValidator = new StructurizrValidator();

  // Log backend initialization
  console.log("Initializing diagram rendering backends:");
  console.log("  - JavaRenderBackend (for Mermaid and PlantUML)");
  console.log("  - StructurizrPipelineRenderer (for Structurizr DSL via containerized Structurizr CLI)");

  // Check backend availability and log status
  const javaAvailability = await javaBackend.isAvailable();
  const structurizrAvailable = await structurizrRenderer.isAvailable();

  if (javaAvailability.available) {
    console.log(`✓ JavaRenderBackend is available. Supported types: ${javaAvailability.supportedTypes.join(", ")}`);
  } else {
    console.warn(`✗ JavaRenderBackend is not fully available: ${javaAvailability.message}`);
    vscode.window.showWarningMessage(
      `Some diagram rendering tools are missing: ${javaAvailability.message}. ` +
      `Please install the required tools for full functionality.`
    );
  }

  if (structurizrAvailable) {
    console.log("✓ StructurizrPipelineRenderer is available (containerized Structurizr CLI)");
  } else {
    console.warn("✗ StructurizrPipelineRenderer is not available. Structurizr CLI path/container may be misconfigured.");
    vscode.window.showWarningMessage(
      "Structurizr rendering is not available. Ensure:\n" +
      "1. Structurizr CLI is installed or available in the configured container\n" +
      "2. The configured Structurizr CLI path or container name is correct\n" +
      "3. Docker is running if you use a containerized Structurizr CLI"
    );
  }

  const defaultOrchestrator = new RendererOrchestratorImpl(
    javaBackend,
    new FileScannerImpl(),
    new OutputManagerImpl(),
    new ProgressReporterImpl(),
    structurizrRenderer,
    structurizrValidator
  );
  const diagramCommandHandler = new CommandHandlerImpl(defaultOrchestrator);
  diagramCommandHandler.register(context);


  // Docker build tasks
  registerPaletteBuildCommands(context);

  // Word to Markdown conversion
  registerWordToMarkdownCommand(context);
  registerPdfToMarkdownCommand(context);

  // SO Chat Participant (uses so_agent_context.md + skills)
  registerSoParticipant(context, assetResolver);

  // Switch environment command (requires Configuration Manager)
  registerSwitchEnvironmentCommand(context, configurationManager);

  // Validate Structurizr DSL diagrams
  registerValidateDiagramsCommand(context);

  // Export to Word Document (.docx)
  registerDocxExportCommand(context);


  // ========================================
  // Diagram Previewer Feature
  // ========================================

  try {
    // Create output channel for diagram previewer logging
    diagramPreviewerOutputChannel = vscode.window.createOutputChannel('Diagram Previewer');
    context.subscriptions.push(diagramPreviewerOutputChannel);

    // Initialize logger
    const logger = initializeLogger(diagramPreviewerOutputChannel, false);
    logger.info('Initializing Diagram Previewer...');

    // Initialize PanelManager singleton
    diagramPreviewerPanelManager = PanelManager.getInstance(context);

    // Register "Open Diagram Preview" command
    context.subscriptions.push(
      vscode.commands.registerCommand('diagramPreviewer.openPreview', () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage('No active editor found. Please open a diagram file first.');
            logger.warning('Command invoked but no active editor found');
            return;
          }

          logger.info(`Opening preview for: ${editor.document.fileName}`);
          diagramPreviewerPanelManager!.openPreview(editor);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error opening preview', error);
          vscode.window.showErrorMessage(`Failed to open diagram preview: ${errorMessage}`);
        }
      })
    );

    // Register "Open Preview from Explorer" command
    context.subscriptions.push(
      vscode.commands.registerCommand('diagramPreviewer.openPreviewFromExplorer', async (uri: vscode.Uri) => {
        try {
          if (!uri) {
            vscode.window.showWarningMessage('No file selected for preview.');
            logger.warning('Command invoked but no file URI provided');
            return;
          }

          logger.info(`Opening preview from explorer for: ${uri.fsPath}`);
          await diagramPreviewerPanelManager!.openPreviewFromExplorer(uri);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error opening preview from explorer', error);
          vscode.window.showErrorMessage(`Failed to open diagram preview: ${errorMessage}`);
        }
      })
    );

    // Register "Export Diagram" command
    context.subscriptions.push(
      vscode.commands.registerCommand('diagramPreviewer.export', async () => {
        try {
          logger.info('Export diagram command invoked');
          await diagramPreviewerPanelManager!.exportDiagram();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error exporting diagram', error);
          vscode.window.showErrorMessage(`Failed to export diagram: ${errorMessage}`);
        }
      })
    );

    // Register text document change listeners with debounce
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document === event.document && diagramPreviewerPanelManager) {
            // Check if this is a supported diagram file
            const fileExtension = event.document.fileName.split('.').pop()?.toLowerCase();
            const supportedExtensions = [
              'mmd', 'mermaid', 'dsl', 'puml', 'plantuml', 'pu', 'dot', 'gv',
              'bpmn', 'excalidraw', 'vg', 'vl', 'wsd', 'ditaa', 'er', 'nomnoml',
              'pikchr', 'svgbob', 'umlet', 'vdx', 'wavedrom'
            ];

            if (fileExtension && supportedExtensions.includes(fileExtension)) {
              diagramPreviewerPanelManager.updatePreview(editor);
            }
          }
        } catch (error) {
          logger.error('Error updating preview', error);
          // Don't show error message to user for every keystroke - just log it
        }
      })
    );

    // Load and log configuration
    const diagramPreviewerConfig = readConfig();
    logger.configChange(diagramPreviewerConfig);

    // Listen for configuration changes
    context.subscriptions.push(
      onConfigChange((newConfig) => {
        logger.configChange(newConfig);

        // Apply configuration changes to panel manager
        if (diagramPreviewerPanelManager) {
          diagramPreviewerPanelManager.handleConfigChange();
        }

        vscode.window.showInformationMessage('Diagram Previewer configuration updated and applied.');
      })
    );

    logger.info('Diagram Previewer initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize Diagram Previewer:', error);
    if (diagramPreviewerOutputChannel) {
      logDiagramPreviewerMessage(`Failed to initialize: ${errorMessage}`, 'error');
    }
    vscode.window.showErrorMessage(`Failed to initialize Diagram Previewer: ${errorMessage}`);
  }

  // ========================================
  // End Diagram Previewer Feature
  // ========================================


}


export function deactivate() {
  // Cleanup Configuration Manager
  if (configurationManager) {
    configurationManager.dispose();
    configurationManager = undefined;
  }

  // Cleanup Diagram Previewer
  if (diagramPreviewerPanelManager) {
    diagramPreviewerPanelManager.dispose();
    diagramPreviewerPanelManager = undefined;
  }

  if (diagramPreviewerOutputChannel) {
    diagramPreviewerOutputChannel.dispose();
    diagramPreviewerOutputChannel = undefined;
  }
}
