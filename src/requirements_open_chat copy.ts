import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";

// AssetResolver kept for API compatibility with extension.ts
// (initializeRequirementsAssetResolver is still called from activate())
let _assetResolver: AssetResolver;

export function initializeRequirementsAssetResolver(resolver: AssetResolver): void {
  _assetResolver = resolver;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slash-command mode: @so /generate, @so /eval, @so /patch ..., @so /recheck */
async function openSoCommand(command: string, text?: string): Promise<void> {
  const query = text ? `@so /${command} ${text}` : `@so /${command}`;
  await vscode.commands.executeCommand("workbench.action.chat.open", { query });
}

/** Free query mode: @so What are the integration requirements? */
async function openSoQuery(text: string): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.chat.open", { query: `@so ${text}` });
}

// ---------------------------------------------------------------------------
// Slash-command workflow  (Command Palette: SO: 1-01 ... 1-04)
// ---------------------------------------------------------------------------

export async function reqInventoryGenerateOpenChat(): Promise<void> {
  await openSoCommand("generate");
}

export async function reqInventoryEvalOpenChat(): Promise<void> {
  await openSoCommand("eval");
}

export async function reqInventoryPatchOpenChat(): Promise<void> {
  const issueIds = await vscode.window.showInputBox({
    title: "Patch Requirements Inventory",
    prompt: "IssueIds to patch (comma-separated), e.g. INV-BRD-001",
    placeHolder: "INV-BRD-001",
    ignoreFocusOut: true,
  });

  if (!issueIds?.trim()) { return; }

  const ids = issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", ");
  await openSoCommand("patch", `IssueIds: ${ids}`);
}

export async function reqInventoryRecheckOpenChat(): Promise<void> {
  await openSoCommand("recheck");
}

// ---------------------------------------------------------------------------
// Context-menu commands on requirements.inventory.md & brd.md
// These use free query mode — the participant answers from the loaded inventory
// ---------------------------------------------------------------------------

/** Right-click brd.md -> "Create Requirements Inventory" */
export async function createRequirementsInventory(): Promise<void> {
  await openSoCommand("generate");
}

/** Right-click requirements.inventory.md -> "Evaluate Requirements Inventory" */
export async function evaluateRequirementsInventory(): Promise<void> {
  await openSoCommand("eval");
}

/** Right-click requirements.inventory.md -> "Patch Requirements Gaps" */
export async function patchRequirementsInventory(): Promise<void> {
  await reqInventoryPatchOpenChat();
}

/** Right-click requirements.inventory.md -> "What are the integration requirements?" */
export async function showIntegrationRequirements(): Promise<void> {
  await openSoQuery("What are the integration requirements?");
}