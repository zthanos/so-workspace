import * as vscode from "vscode";
import * as path from "path";

/**
 * Resolves asset paths inside the installed extension.
 * Ensures deterministic access to packaged prompts, templates, and rules.
 */
export class AssetResolver {
  private extensionContext: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.extensionContext = context;
  }

  /**
   * Returns the base URI of the extension installation.
   */
  private getExtensionBaseUri(): vscode.Uri {
    return this.extensionContext.extensionUri;
  }

  /**
   * Resolves a file inside assets/templates/
   */
  getTemplatePath(fileName: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.getExtensionBaseUri(),
      "assets",
      "templates",
      fileName
    );
  }

  /**
   * Resolves a file inside assets/agent/prompts/
   */
  getPromptPath(fileName: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.getExtensionBaseUri(),
      "assets",
      "agent",
      "prompts",
      fileName
    );
  }

  /**
   * Resolves the SO agent context template (extension baseline).
   * Used as fallback when workspace docs/so_agent_context.md is not present.
   */
  getAgentContextTemplatePath(): vscode.Uri {
    return vscode.Uri.joinPath(
      this.getExtensionBaseUri(),
      "assets",
      "templates",
      "so_agent_context.md"
    );
  }

  /**
   * Resolves a file inside assets/agent/rules/
   */
  getRulePath(fileName: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.getExtensionBaseUri(),
      "assets",
      "agent",
      "rules",
      fileName
    );
  }

  /**
   * Reads an asset file as string.
   */
  async readAsset(uri: vscode.Uri): Promise<string> {
    try {
      const data = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(data).toString("utf-8");
    } catch (error) {
      throw new Error(`Asset not found or unreadable: ${uri.fsPath}`);
    }
  }

  /**
   * Checks if an asset exists.
   */
  async assetExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}
