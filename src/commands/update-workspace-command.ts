import * as vscode from "vscode";
import { AssetResolver } from "../asset-resolver";
import { WorkspaceInitializer } from "../workspace-initializer";

/**
 * Command handler for refreshing workspace-owned templates from the current
 * extension version without reinitializing project artifacts.
 */
export async function updateWorkspaceCommand(assetResolver: AssetResolver): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder is open. Please open a folder first.");
      return;
    }

    const response = await vscode.window.showWarningMessage(
      "Update workspace templates from the current extension version? This will overwrite .github/skills, .github/rules, docs/so_agent_context.md, and README_SO_Workspace.md.",
      { modal: true },
      "Update",
      "Update All",
      "Cancel"
    );

    if (response !== "Update" && response !== "Update All") {
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri;
    const initializer = new WorkspaceInitializer(assetResolver);
    await initializer.updateWorkspaceTemplates(
      workspaceRoot,
      response === "Update All" ? "all" : "standard"
    );
  } catch (error) {
    console.error("Failed to update workspace templates:", error);
    vscode.window.showErrorMessage(
      `Failed to update SO workspace templates: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
