import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { AssetResolver } from "./asset-resolver";

const execAsync = promisify(exec);
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
import { initializeWorkspaceCommand } from "./commands/initialize-workspace-command";
import { repairMermaidDiagramsCommand } from "./commands/repair-mermaid-diagrams-command";

// Type definitions for mermaid-cli detection

// Documentation URL for mermaid-cli installation troubleshooting
const MERMAID_CLI_DOCS_URL = 'https://github.com/mermaid-js/mermaid-cli#installation';
interface MermaidCLIResolution {
  /** Resolved path to mmdc executable, or null if not found */
  path: string | null;
  
  /** Source of the resolved path */
  source: 'custom' | 'project' | 'global' | 'not-found';
  
  /** Error message if resolution failed */
  error?: string;
  
  /** Additional context for troubleshooting */
  context?: {
    configuredPath?: string;
    checkedPaths?: string[];
    platform?: string;
  };
}

interface DetectionResult {
  /** Whether the executable was found and is accessible */
  found: boolean;
  
  /** Full path to the executable */
  path?: string;
  
  /** Reason for failure if not found */
  reason?: 'not-exists' | 'not-executable' | 'not-accessible';
  
  /** Human-readable error message */
  message?: string;
}

/**
 * Check if a file exists and is accessible/executable
 * @param filePath Path to the file to check
 * @returns DetectionResult with found status and error details
 */
async function checkFileAccessibility(filePath: string): Promise<DetectionResult> {
  try {
    const stats = await fs.promises.stat(filePath);
    
    if (!stats.isFile()) {
      return {
        found: false,
        reason: 'not-exists',
        message: `Path exists but is not a file: ${filePath}`
      };
    }
    
    // Check read permission
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return {
        found: false,
        reason: 'not-accessible',
        message: `File exists but is not readable: ${filePath}`
      };
    }
    
    // Check execute permission (Unix only)
    if (process.platform !== 'win32') {
      try {
        await fs.promises.access(filePath, fs.constants.X_OK);
      } catch {
        return {
          found: false,
          reason: 'not-executable',
          message: `File exists but is not executable: ${filePath}`
        };
      }
    }
    
    return {
      found: true,
      path: filePath
    };
  } catch (error) {
    return {
      found: false,
      reason: 'not-exists',
      message: `File does not exist: ${filePath}`
    };
  }
}

/**
 * Get the global npm installation path
 * @returns Global node_modules path or null if not found
 */
async function getGlobalNpmPath(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('npm root -g');
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Resolve the path to the mermaid-cli executable
 * @param configuredPath Path configured in settings
 * @param workspaceRoot Root path of the workspace
 * @param extensionPath Path to the extension directory
 * @returns MermaidCLIResolution with path, source, and error information
 */
async function resolveMermaidCLIPath(
  configuredPath: string,
  workspaceRoot: string,
  extensionPath: string
): Promise<MermaidCLIResolution> {
  const mmcdExecutable = process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc';
  const checkedPaths: string[] = [];
  
  // 1. Check custom configured path (if not default "mmdc")
  if (configuredPath !== 'mmdc') {
    checkedPaths.push(configuredPath);
    const result = await checkFileAccessibility(configuredPath);
    
    if (result.found) {
      return {
        path: configuredPath,
        source: 'custom',
        context: {
          configuredPath,
          checkedPaths,
          platform: process.platform
        }
      };
    } else {
      return {
        path: null,
        source: 'not-found',
        error: `Configured Mermaid CLI path is invalid: ${result.message}`,
        context: {
          configuredPath,
          checkedPaths,
          platform: process.platform
        }
      };
    }
  }
  
  // 2. Check project node_modules
  if (workspaceRoot) {
    const projectMmdc = path.join(workspaceRoot, 'node_modules', '.bin', mmcdExecutable);
    checkedPaths.push(projectMmdc);
    const result = await checkFileAccessibility(projectMmdc);
    
    if (result.found) {
      return {
        path: projectMmdc,
        source: 'project',
        context: {
          configuredPath,
          checkedPaths,
          platform: process.platform
        }
      };
    }
  }
  
  // 3. Check global npm installation
  const globalNodeModules = await getGlobalNpmPath();
  if (globalNodeModules) {
    const globalMmdc = path.join(globalNodeModules, '.bin', mmcdExecutable);
    checkedPaths.push(globalMmdc);
    const result = await checkFileAccessibility(globalMmdc);
    
    if (result.found) {
      return {
        path: globalMmdc,
        source: 'global',
        context: {
          configuredPath,
          checkedPaths,
          platform: process.platform
        }
      };
    }
  }
  
  // 4. Not found in any location
  return {
    path: null,
    source: 'not-found',
    error: 'Mermaid CLI (mmdc) not found in any location. Please install @mermaid-js/mermaid-cli globally or in your project.',
    context: {
      configuredPath,
      checkedPaths,
      platform: process.platform
    }
  };
}

// Store command handler instances for cleanup
let javaCommandHandler: JavaCommandHandler | undefined;
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

  // Diagram rendering with Java backend (V2 implementation)
  // Note: This uses the default orchestrator with local rendering backends
  const { RendererOrchestratorImpl, FileScannerImpl, OutputManagerImpl, ProgressReporterImpl } = require("./diagram_renderer_v2");
  const { JavaRenderBackend } = require("./java-backend");
  const { StructurizrRenderer } = require("./structurizr-renderer");
  const { StructurizrValidator } = require("./structurizr-validator");

  // Initialize Configuration Manager first (needed for Java backend config)
  configurationManager = new ConfigurationManager();
  await configurationManager.initialize(context).catch(error => {
    console.error("Failed to initialize Configuration Manager:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize workspace configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  });

  // Get Java backend configuration
  const javaConfig = configurationManager.getConfiguration().java;
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Resolve PlantUML JAR path (absolute or relative to workspace)
  const plantUmlJarPath = path.isAbsolute(javaConfig.plantUmlJarPath)
    ? javaConfig.plantUmlJarPath
    : path.join(workspaceRoot, javaConfig.plantUmlJarPath);

  // Resolve Mermaid CLI path using detection system
  const mermaidResolution = await resolveMermaidCLIPath(
    javaConfig.mermaidCliPath,
    workspaceRoot,
    context.extensionPath
  );
  
  let mermaidCliPath = mermaidResolution.path || 'mmdc'; // Fallback to 'mmdc' if not found
  
  // Show warning if mermaid-cli was not found
  if (!mermaidResolution.path) {
    // Check if this is the first run (first time mermaid-cli not found)
    const hasShownFirstRunMessage = context.globalState.get<boolean>('mermaidCliFirstRunMessageShown', false);
    
    if (!hasShownFirstRunMessage) {
      // First-run: Show informational message with installation guidance
      const message = mermaidResolution.source === 'custom'
        ? `Welcome to SO Workspace!\n\nMermaid CLI was not found at the configured path. This extension requires @mermaid-js/mermaid-cli to be installed separately for Mermaid diagram rendering.\n\nInstall Mermaid CLI:\n  Global: npm install -g @mermaid-js/mermaid-cli\n  Project: npm install --save-dev @mermaid-js/mermaid-cli\n\nYou can continue using other features while Mermaid CLI is not installed.`
        : `Welcome to SO Workspace!\n\nThis extension requires @mermaid-js/mermaid-cli to be installed separately for Mermaid diagram rendering.\n\nInstall globally:\n  npm install -g @mermaid-js/mermaid-cli\n\nOr install in your project:\n  npm install --save-dev @mermaid-js/mermaid-cli\n\nYou can continue using other features while Mermaid CLI is not installed.`;
      
      vscode.window.showInformationMessage(
        message,
        'Install Instructions',
        'Dismiss'
      ).then(selection => {
        if (selection === 'Install Instructions') {
          vscode.env.openExternal(vscode.Uri.parse(MERMAID_CLI_DOCS_URL));
        }
      });
      
      // Mark that we've shown the first-run message
      context.globalState.update('mermaidCliFirstRunMessageShown', true);
    } else {
      // Subsequent runs: Show standard warning message
      const errorMessage = mermaidResolution.source === 'custom' 
        ? `Mermaid CLI not found at configured path.\n\n${mermaidResolution.error || 'The configured path is invalid or inaccessible.'}\n\nInstall Mermaid CLI:\n  Global: npm install -g @mermaid-js/mermaid-cli\n  Project: npm install --save-dev @mermaid-js/mermaid-cli\n\nFor troubleshooting, see: ${MERMAID_CLI_DOCS_URL}`
        : `Mermaid CLI (mmdc) not found.\n\nThe extension requires @mermaid-js/mermaid-cli to be installed separately.\n\nInstall globally:\n  npm install -g @mermaid-js/mermaid-cli\n\nOr install in your project:\n  npm install --save-dev @mermaid-js/mermaid-cli\n\nFor more help, see: ${MERMAID_CLI_DOCS_URL}`;
      
      vscode.window.showWarningMessage(
        errorMessage,
        'Open Documentation'
      ).then(selection => {
        if (selection === 'Open Documentation') {
          vscode.env.openExternal(vscode.Uri.parse(MERMAID_CLI_DOCS_URL));
        }
      });
    }
  }

  // Create Java backend instance with configuration
  const javaBackend = new JavaRenderBackend({
    plantUmlJarPath,
    mermaidCliPath,
    javaPath: javaConfig.javaPath
  });

  // Get Structurizr CLI configuration from settings
  const structurizrConfig = configurationManager.getConfiguration().structurizr;
  const structurizrContainer = vscode.workspace.getConfiguration("so-workspace").get<string>("diagrams.structurizrCliContainer") || "structurizr-cli";

  // Create Structurizr renderer and validator with Docker configuration
  const structurizrRenderer = new StructurizrRenderer(
    structurizrConfig.structurizrCliPath,
    structurizrContainer,
    workspaceRoot
  );
  const structurizrValidator = new StructurizrValidator();

  // Log backend initialization
  console.log("Initializing diagram rendering backends:");
  console.log("  - JavaRenderBackend (for Mermaid and PlantUML)");
  console.log("  - StructurizrRenderer (for Structurizr DSL)");

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
    console.log("✓ StructurizrRenderer is available (Docker-based Structurizr CLI)");
  } else {
    console.warn("✗ StructurizrRenderer is not available. Docker may not be running or Structurizr CLI not configured.");
    vscode.window.showWarningMessage(
      "Structurizr rendering is not available. Ensure Docker is running and containers are started. " +
      "Run: docker-compose -f docker-compose.structurizr.yml up -d"
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


  // Diagram rendering with Java backend (PlantUML JAR + Mermaid CLI)
  javaCommandHandler = new JavaCommandHandler(configurationManager);
  javaCommandHandler.register(context);

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

  // Listen for configuration changes to validate mermaidCliPath
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('so-workspace.diagrams.java.mermaidCliPath')) {
        const newPath = vscode.workspace.getConfiguration().get<string>('so-workspace.diagrams.java.mermaidCliPath', 'mmdc');
        
        // Only validate if it's a custom path (not the default "mmdc")
        if (newPath !== 'mmdc') {
          const result = await checkFileAccessibility(newPath);
          if (!result.found) {
            vscode.window.showErrorMessage(
              `Invalid Mermaid CLI path: ${result.message}\n\n` +
              `Reset to "mmdc" for auto-detection or provide a valid path.\n\n` +
              `For troubleshooting, see: ${MERMAID_CLI_DOCS_URL}`,
              'Open Documentation',
              'Reset to Default'
            ).then(selection => {
              if (selection === 'Open Documentation') {
                vscode.env.openExternal(vscode.Uri.parse(MERMAID_CLI_DOCS_URL));
              } else if (selection === 'Reset to Default') {
                vscode.workspace.getConfiguration().update(
                  'so-workspace.diagrams.java.mermaidCliPath',
                  'mmdc',
                  vscode.ConfigurationTarget.Workspace
                );
              }
            });
          } else {
            vscode.window.showInformationMessage(
              `Mermaid CLI path validated successfully: ${newPath}`
            );
          }
        }
      }
    })
  );
}


export function deactivate() {
  // Cleanup command handlers if needed
  // Note: Currently the backend has no-op cleanup methods,
  // but this provides a hook for future cleanup requirements
  javaCommandHandler = undefined;
  
  // Cleanup Configuration Manager
  if (configurationManager) {
    configurationManager.dispose();
    configurationManager = undefined;
  }
}
