import * as vscode from "vscode";
import { AssetResolver } from "../asset-resolver";
import { WorkspaceInitializer } from "../workspace-initializer";

/**
 * Command handler for "SO: 0-02 Initialize SO Workspace Structure"
 * Creates the SO workspace folder structure and template files
 */
export async function initializeWorkspaceCommand(assetResolver: AssetResolver): Promise<void> {
  try {
    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri;

    // Create WorkspaceInitializer instance
    const initializer = new WorkspaceInitializer(assetResolver);

    // Call initialize() method
    await initializer.initialize(workspaceRoot);

  } catch (error) {
    console.error('Failed to initialize workspace:', error);
    vscode.window.showErrorMessage(
      `Failed to initialize SO workspace: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
