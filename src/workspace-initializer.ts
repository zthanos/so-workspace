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
    const sentinelUri = vscode.Uri.joinPath(workspaceRoot, "docs", ".so-workspace.json");
    try {
      await vscode.workspace.fs.stat(sentinelUri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes the full initialization process
   * @param workspaceRoot - Root URI of the workspace
   * @param force - Whether to force initialization even if already initialized
   */
  async initialize(workspaceRoot: vscode.Uri, force: boolean = false): Promise<void> {
    try {
      // Check if already initialized
      if ((await this.isInitialized(workspaceRoot)) && !force) {
        const response = await vscode.window.showWarningMessage(
          "This workspace appears to be already initialized. Do you want to continue?",
          "Yes",
          "No"
        );
        if (response !== "Yes") return;
      }

      // Create folder structure
      await this.createFolderStructure(workspaceRoot);

      // Create skeletons for discussions and references (deterministic)
      await this.writeFileIfNotExists(
        workspaceRoot,
        "docs/98_discussions/README.md",
        `# Discussions Folder

This folder contains project-specific clarifications, meeting notes, and contextual decisions not originally present in the BRD.

## Usage Guidelines

- Timestamp discussion entries
- Distinguish decisions from open questions
- If discussions impact artifacts, re-run Evaluate → Patch → Recheck
`
      );

      await this.writeFileIfNotExists(
        workspaceRoot,
        "docs/99_references/README.md",
        `# References Folder

This folder contains a project-scoped snapshot of enterprise-approved references.

The canonical source lives in a shared repository, but only references copied into this workspace are used during generation.

## Usage Guidelines

- Copy only the references needed for this project
- If deviating from a reference, record justification in ADRs
- References must not override authoritative project artifacts
`
      );

      await this.writeFileIfNotExists(
        workspaceRoot,
        "docs/99_references/REFERENCES_MANIFEST.md",
        `# Reference Manifest

List the references used in this project.

## Format

- Reference ID:
- Title:
- Version / Tag / Commit:
- Reason for inclusion:
`
      );

      // Copy template files (README, flows, agent context, etc.)
      await this.copyTemplateFiles(workspaceRoot, force);

      // Generate project info (create if missing; optionally overwrite if force)
      await this.ensureProjectInfo(workspaceRoot, force);

      // Create sentinel file
      await this.createSentinelFile(workspaceRoot);

      vscode.window.showInformationMessage("SO workspace initialized successfully!");
    } catch (error) {
      console.error("Workspace initialization failed:", error);
      vscode.window.showErrorMessage(
        `Failed to initialize workspace: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Creates the folder structure for an SO workspace
   * @param workspaceRoot - Root URI of the workspace
   */
  async createFolderStructure(workspaceRoot: vscode.Uri): Promise<void> {
    const folders = [
      "inbox/brd",
      "docs/00_brd",
      "docs/01_requirements",
      "docs/02_objectives",
      "docs/03_architecture",
      "docs/03_architecture/diagrams/src/seq",
      "docs/03_architecture/diagrams/src/flow",
      "docs/04_decisions",
      "docs/98_discussions",
      "docs/99_references",
    ];

    for (const folder of folders) {
      const folderUri = this.uriFromRelative(workspaceRoot, folder);
      try {
        await vscode.workspace.fs.stat(folderUri);
        // exists -> skip
      } catch {
        await vscode.workspace.fs.createDirectory(folderUri);
      }
    }
  }

  /**
   * Copies template files to the workspace
   * @param workspaceRoot - Root URI of the workspace
   * @param overwrite - Whether to overwrite existing files
   */
  async copyTemplateFiles(workspaceRoot: vscode.Uri, overwrite: boolean): Promise<void> {
    // flows.yaml template
    const flowsTemplateUri = this.assetResolver.getTemplatePath("flows.yaml.template");
    const flowsTargetUri = vscode.Uri.joinPath(workspaceRoot, "docs", "02_objectives", "flows.yaml");
    await this.copyFileIfNeeded(flowsTemplateUri, flowsTargetUri, overwrite);

    // README_SO_Workspace.md
    const readmeTemplateUri = this.assetResolver.getTemplatePath("README_SO_Workspace.md");
    const readmeTargetUri = vscode.Uri.joinPath(workspaceRoot, "docs", "README_SO_Workspace.md");
    await this.copyFileIfNeeded(readmeTemplateUri, readmeTargetUri, overwrite);

    // so_agent_context.md (recommended: keep deterministic + versioned via template)
    try {
      const ctxTemplateUri = this.assetResolver.getAgentContextTemplatePath();
      const ctxTargetUri = vscode.Uri.joinPath(workspaceRoot, "docs", "so_agent_context.md");
      await this.copyFileIfNeeded(ctxTemplateUri, ctxTargetUri, overwrite);
    } catch {
      // If the template isn't present yet, skip silently.
      // (You can log to Output channel later if you want.)
    }
  }

  /**
   * Ensures project_information.md exists; optionally overwrites if force and user confirms.
   */
  private async ensureProjectInfo(workspaceRoot: vscode.Uri, force: boolean): Promise<void> {
    const projectInfoUri = vscode.Uri.joinPath(workspaceRoot, "docs", "project_information.md");

    const exists = await this.exists(projectInfoUri);
    if (!exists) {
      await this.generateProjectInfo(workspaceRoot);
      return;
    }

    if (force) {
      const response = await vscode.window.showWarningMessage(
        "File project_information.md already exists. Overwrite?",
        "Yes",
        "No"
      );
      if (response === "Yes") {
        await this.generateProjectInfo(workspaceRoot);
      }
    }
  }

  /**
   * Generates the project_information.md file
   * @param workspaceRoot - Root URI of the workspace
   */
  async generateProjectInfo(workspaceRoot: vscode.Uri): Promise<void> {
    const currentDate = new Date().toISOString().split("T")[0];
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

    const targetUri = vscode.Uri.joinPath(workspaceRoot, "docs", "project_information.md");
    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
  }

  /**
   * Creates the sentinel file to mark workspace as initialized
   * @param workspaceRoot - Root URI of the workspace
   */
  async createSentinelFile(workspaceRoot: vscode.Uri): Promise<void> {
    const sentinelUri = vscode.Uri.joinPath(workspaceRoot, "docs", ".so-workspace.json");
    const content = JSON.stringify(
      {
        initialized: true,
        version: "1.0",
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
    await vscode.workspace.fs.writeFile(sentinelUri, new TextEncoder().encode(content));
  }

  private async writeFileIfNotExists(
    workspaceRoot: vscode.Uri,
    relativePath: string,
    content: string
  ): Promise<void> {
    const targetUri = this.uriFromRelative(workspaceRoot, relativePath);
    const exists = await this.exists(targetUri);
    if (exists) return;
    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
  }

  private async copyFileIfNeeded(
    sourceUri: vscode.Uri,
    targetUri: vscode.Uri,
    overwrite: boolean
  ): Promise<void> {
    const exists = await this.exists(targetUri);

    if (exists && overwrite) {
      const response = await vscode.window.showWarningMessage(
        `File ${targetUri.fsPath} already exists. Overwrite?`,
        "Yes",
        "No"
      );
      if (response === "Yes") {
        await vscode.workspace.fs.copy(sourceUri, targetUri, { overwrite: true });
      }
      return;
    }

    if (!exists) {
      await vscode.workspace.fs.copy(sourceUri, targetUri);
    }
  }

  /**
   * Converts a workspace-relative path (using "/") into a safe VS Code Uri join.
   */
  private uriFromRelative(workspaceRoot: vscode.Uri, relativePath: string): vscode.Uri {
    const parts = relativePath.split("/").filter(Boolean);
    return vscode.Uri.joinPath(workspaceRoot, ...parts);
  }

  private async exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}
