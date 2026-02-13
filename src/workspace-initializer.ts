import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";

/**
 * Initializes a new SO workspace with the required folder structure
 * and template files.
 */
export class WorkspaceInitializer {
  private assetResolver: AssetResolver;

  constructor(assetResolver: AssetResolver) {
    this.assetResolver = assetResolver;
  }

  /**
   * Checks if the workspace is already initialized
   * @param workspaceRoot - Root URI of the workspace
   * @returns True if sentinel file exists
   */
  async isInitialized(workspaceRoot: vscode.Uri): Promise<boolean> {
    const sentinelUri = vscode.Uri.joinPath(workspaceRoot, 'docs', '.so-workspace.json');
    try {
      await vscode.workspace.fs.stat(sentinelUri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates the folder structure for an SO workspace
   * @param workspaceRoot - Root URI of the workspace
   */
  async createFolderStructure(workspaceRoot: vscode.Uri): Promise<void> {
    const folders = [
      'inbox/brd',
      'docs/00_brd',
      'docs/01_requirements',
      'docs/02_objectives',
      'docs/03_architecture/diagrams/src/seq',
      'docs/03_architecture/diagrams/src/flow'
    ];

    for (const folder of folders) {
      const folderUri = vscode.Uri.joinPath(workspaceRoot, folder);
      try {
        await vscode.workspace.fs.createDirectory(folderUri);
      } catch (error) {
        // Folder might already exist, which is fine
        console.log(`Folder ${folder} already exists or could not be created:`, error);
      }
    }
  }

  /**
   * Copies template files to the workspace
   * @param workspaceRoot - Root URI of the workspace
   * @param overwrite - Whether to overwrite existing files
   */
  async copyTemplateFiles(workspaceRoot: vscode.Uri, overwrite: boolean): Promise<void> {
    // Copy flows.yaml template
    const flowsTemplateUri = this.assetResolver.getTemplatePath('flows.yaml.template');
    const flowsTargetUri = vscode.Uri.joinPath(workspaceRoot, 'docs/02_objectives/flows.yaml');
    await this.copyFileIfNeeded(flowsTemplateUri, flowsTargetUri, overwrite);

    // Copy README
    const readmeTemplateUri = this.assetResolver.getTemplatePath('README_SO_Workspace.md');
    const readmeTargetUri = vscode.Uri.joinPath(workspaceRoot, 'docs/README_SO_Workspace.md');
    await this.copyFileIfNeeded(readmeTemplateUri, readmeTargetUri, overwrite);
  }

  /**
   * Generates the project_information.md file
   * @param workspaceRoot - Root URI of the workspace
   */
  async generateProjectInfo(workspaceRoot: vscode.Uri): Promise<void> {
    const currentDate = new Date().toISOString().split('T')[0];
    const content = `# Project Information

**Project Name:** [Enter project name]

**Description:** [Enter project description]

**Version:** [Enter version]

**Date:** ${currentDate}

## Overview

[Provide a brief overview of the project]

## Stakeholders

[List key stakeholders]

## References

[List relevant references and documentation]
`;

    const targetUri = vscode.Uri.joinPath(workspaceRoot, 'docs/project_information.md');
    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
  }

  /**
   * Creates the sentinel file to mark workspace as initialized
   * @param workspaceRoot - Root URI of the workspace
   */
  async createSentinelFile(workspaceRoot: vscode.Uri): Promise<void> {
    const sentinelUri = vscode.Uri.joinPath(workspaceRoot, 'docs/.so-workspace.json');
    const content = JSON.stringify({
      initialized: true,
      version: '1.0',
      timestamp: new Date().toISOString()
    }, null, 2);
    await vscode.workspace.fs.writeFile(sentinelUri, new TextEncoder().encode(content));
  }

  /**
   * Executes the full initialization process
   * @param workspaceRoot - Root URI of the workspace
   * @param force - Whether to force initialization even if already initialized
   */
  async initialize(workspaceRoot: vscode.Uri, force: boolean = false): Promise<void> {
    try {
      // Check if already initialized
      if (await this.isInitialized(workspaceRoot) && !force) {
        const response = await vscode.window.showWarningMessage(
          'This workspace appears to be already initialized. Do you want to continue?',
          'Yes', 'No'
        );
        if (response !== 'Yes') {
          return;
        }
      }

      // Create folder structure
      await this.createFolderStructure(workspaceRoot);

      // Copy template files
      await this.copyTemplateFiles(workspaceRoot, force);

      // Generate project info
      const projectInfoUri = vscode.Uri.joinPath(workspaceRoot, 'docs/project_information.md');
      try {
        await vscode.workspace.fs.stat(projectInfoUri);
        // File exists, ask before overwriting
        if (force) {
          const response = await vscode.window.showWarningMessage(
            'File project_information.md already exists. Overwrite?',
            'Yes', 'No'
          );
          if (response === 'Yes') {
            await this.generateProjectInfo(workspaceRoot);
          }
        }
      } catch {
        // File doesn't exist, create it
        await this.generateProjectInfo(workspaceRoot);
      }

      // Create sentinel file
      await this.createSentinelFile(workspaceRoot);

      vscode.window.showInformationMessage('SO workspace initialized successfully!');
    } catch (error) {
      console.error('Workspace initialization failed:', error);
      vscode.window.showErrorMessage(
        `Failed to initialize workspace: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private async copyFileIfNeeded(
    sourceUri: vscode.Uri,
    targetUri: vscode.Uri,
    overwrite: boolean
  ): Promise<void> {
    try {
      await vscode.workspace.fs.stat(targetUri);
      // File exists
      if (overwrite) {
        const response = await vscode.window.showWarningMessage(
          `File ${targetUri.fsPath} already exists. Overwrite?`,
          'Yes', 'No'
        );
        if (response === 'Yes') {
          await vscode.workspace.fs.copy(sourceUri, targetUri, { overwrite: true });
        }
      }
    } catch {
      // File doesn't exist, copy it
      await vscode.workspace.fs.copy(sourceUri, targetUri);
    }
  }
}
