import * as vscode from "vscode";

/**
 * Resolves paths to extension assets (prompts, templates, rules, images)
 * using the VS Code extension installation path.
 */
export class AssetResolver {
  private extensionContext: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.extensionContext = context;
  }

  /**
   * Resolves a path to a prompt file
   * @param relativePath - Path relative to assets/agent/prompts/
   * @returns Absolute URI to the prompt file
   */
  getPromptPath(relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      'assets',
      'agent',
      'prompts',
      relativePath
    );
  }

  /**
   * Resolves a path to a template file
   * @param relativePath - Path relative to assets/templates/
   * @returns Absolute URI to the template file
   */
  getTemplatePath(relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      'assets',
      'templates',
      relativePath
    );
  }

  /**
   * Resolves a path to a rules file
   * @param relativePath - Path relative to assets/agent/rules/
   * @returns Absolute URI to the rules file
   */
  getRulesPath(relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      'assets',
      'agent',
      'rules',
      relativePath
    );
  }

  /**
   * Resolves a path to an image asset
   * @param relativePath - Path relative to assets/templates/
   * @returns Absolute URI to the image file
   */
  getImagePath(relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      'assets',
      'templates',
      relativePath
    );
  }

  /**
   * Reads the content of an asset file
   * @param uri - URI to the asset file
   * @returns File content as string
   */
  async readAsset(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder('utf-8').decode(bytes);
  }
}
