import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import {
  objectivesGenerateOpenChat,
  objectivesEvalOpenChat,
  objectivesPatchOpenChat,
  objectivesRecheckOpenChat,
  initializeObjectivesAssetResolver
} from "./objectives_open_chat";
import {
  reqInventoryGenerateOpenChat,
  reqInventoryEvalOpenChat,
  reqInventoryPatchOpenChat,
  reqInventoryRecheckOpenChat,
  initializeRequirementsAssetResolver
} from "./requirements_open_chat";
import {
  diagramGenerateC4ContextOpenChat,
  diagramGenerateC4ContainerOpenChat,
  diagramEvalOpenChat,
  diagramPatchOpenChat,
  diagramRecheckOpenChat,
  initializeDiagramsAssetResolver
} from "./diagrams_open_chat";
import {
  soGenerateOpenChat,
  soEvalOpenChat,
  soPatchOpenChat,
  soFinalReviewOpenChat,
  initializeSolutionOutlineAssetResolver
} from "./solution_outline_open_chat";
import { registerPaletteBuildCommands } from "./build_open_tasks";
import { CommandHandlerImpl } from "./diagram_renderer_v2";
import { registerWordToMarkdownCommand } from "./word_to_markdown";
import { registerResetGeneratedFilesCommand } from "./reset_generated_files";
import { registerGenerateConfigCommand } from "./generate-config-command";
import { registerSwitchEnvironmentCommand } from "./switch-environment-command";
import { registerValidateDiagramsCommand } from "./validate-diagrams-command";
import { ConfigurationManager } from "./configuration-manager";
import { JavaCommandHandler } from "./java-command-handler";
import { KrokiCommandHandler } from "./kroki-command-handler";
import { initializeWorkspaceCommand } from "./commands/initialize-workspace-command";
import { repairMermaidDiagramsCommand } from "./commands/repair-mermaid-diagrams-command";

// Store command handler instances for cleanup
let javaCommandHandler: JavaCommandHandler | undefined;
let krokiCommandHandler: KrokiCommandHandler | undefined;
let configurationManager: ConfigurationManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  // Create AssetResolver instance
  const assetResolver = new AssetResolver(context);

  // Initialize command handlers with AssetResolver
  initializeRequirementsAssetResolver(assetResolver);
  initializeObjectivesAssetResolver(assetResolver);
  initializeDiagramsAssetResolver(assetResolver);
  initializeSolutionOutlineAssetResolver(assetResolver);

  // Workspace Initialization
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.initialize", () => initializeWorkspaceCommand(assetResolver))
  );

  // Objectives
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.obj.generate", objectivesGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.eval", objectivesEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.patch", objectivesPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.recheck", objectivesRecheckOpenChat)
  );

  // Requirements Inventory (derived from BRD)
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.req.generate", reqInventoryGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.req.eval", reqInventoryEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.req.patch", reqInventoryPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.req.recheck", reqInventoryRecheckOpenChat)
  );

  // Diagrams (evaluate/patch per selected diagram)
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.diagram.generateC4Context", diagramGenerateC4ContextOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.generateC4Container", diagramGenerateC4ContainerOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.eval", diagramEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.patch", diagramPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.recheck", diagramRecheckOpenChat)
  );

  // Solution Outline
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.so.generate", soGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.so.eval", soEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.so.patch", soPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.so.finalReview", soFinalReviewOpenChat)
  );

  // Diagram rendering with Kroki backend (V2 implementation)
  // Note: This uses the default orchestrator with Kroki cloud service backend
  const { RendererOrchestratorImpl, FileScannerImpl, OutputManagerImpl, ProgressReporterImpl } = require("./diagram_renderer_v2");
  const { KrokiRenderBackend } = require("./kroki-backend");
  const krokiBackend = new KrokiRenderBackend();
  const defaultOrchestrator = new RendererOrchestratorImpl(
    krokiBackend,
    new FileScannerImpl(),
    new OutputManagerImpl(),
    new ProgressReporterImpl()
  );
  const diagramCommandHandler = new CommandHandlerImpl(defaultOrchestrator);
  diagramCommandHandler.register(context);

  // Initialize Configuration Manager
  configurationManager = new ConfigurationManager();
  await configurationManager.initialize(context).catch(error => {
    console.error("Failed to initialize Configuration Manager:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize workspace configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  });

  // Diagram rendering with Java backend (PlantUML JAR + Mermaid CLI)
  javaCommandHandler = new JavaCommandHandler(configurationManager);
  javaCommandHandler.register(context);

  // Diagram rendering with Kroki cloud service
  krokiCommandHandler = new KrokiCommandHandler(configurationManager);
  krokiCommandHandler.register(context);

  // Docker build tasks
  registerPaletteBuildCommands(context);

  // Word to Markdown conversion
  registerWordToMarkdownCommand(context);

  // Reset generated files command
  registerResetGeneratedFilesCommand(context);

  // Generate workspace configuration command
  registerGenerateConfigCommand(context);

  // Switch environment command (requires Configuration Manager)
  registerSwitchEnvironmentCommand(context, configurationManager);

  // Validate Structurizr DSL diagrams
  registerValidateDiagramsCommand(context);

  // Repair Mermaid diagram syntax
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.repairMermaidDiagrams", () => repairMermaidDiagramsCommand(configurationManager!))
  );
}


export function deactivate() {
  // Cleanup command handlers if needed
  // Note: Currently both backends have no-op cleanup methods,
  // but this provides a hook for future cleanup requirements
  javaCommandHandler = undefined;
  krokiCommandHandler = undefined;
  
  // Cleanup Configuration Manager
  if (configurationManager) {
    configurationManager.dispose();
    configurationManager = undefined;
  }
}
