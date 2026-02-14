import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import { loadSoAgentContext } from "./so_agent_context";

let assetResolver: AssetResolver;

export function initializeRequirementsAssetResolver(resolver: AssetResolver): void {
  assetResolver = resolver;
}

async function compose(
  baseRel: string,
  specificRel: string,
  extraHeader?: string,
  agentContext?: string
): Promise<string> {
  const baseUri = assetResolver.getPromptPath(baseRel);
  const specificUri = assetResolver.getPromptPath(specificRel);

  const base = await assetResolver.readAsset(baseUri);
  const spec = await assetResolver.readAsset(specificUri);

  let combined =
    extraHeader ? `${base}\n\n${extraHeader}\n\n${spec}` : `${base}\n\n${spec}`;
  if (agentContext) {
    combined = `${agentContext}\n\n---\n\n${combined}`;
  }
  return wrapForAgent(combined);
}

/**
 * Requirements Inventory (derived from BRD) – Open Chat commands.
 *
 * Expected prompt files in repo:
 * - agent/prompts/00_EXECUTE.prompt.md
 * - agent/prompts/01_requirements/10_generate_requirements_inventory.prompt.md
 * - agent/prompts/01_requirements/11_eval_requirements_inventory.prompt.md
 * - agent/prompts/01_requirements/12_patch_requirements_inventory.prompt.md
 * - agent/prompts/01_requirements/13_recheck_requirements_inventory.prompt.md
 */
export async function reqInventoryGenerateOpenChat(): Promise<void> {
  const specific = "01_requirements/00_extract_requirements_inventory.prompt.md";
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose("00_EXECUTE.prompt.md", specific, undefined, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function reqInventoryEvalOpenChat(): Promise<void> {
  const specific = "01_requirements/01_evaluate_inventory.prompt.md";
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose("00_EXECUTE.prompt.md", specific, undefined, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function reqInventoryRecheckOpenChat(): Promise<void> {
  // Prefer dedicated recheck prompt if present, else reuse eval prompt
  const recheckPath = "01_requirements/03_recheck_inventory.prompt.md";
  const evalPath = "01_requirements/01_evaluate_inventory.prompt.md";

  let specific = recheckPath;
  try {
    const recheckUri = assetResolver.getPromptPath(recheckPath);
    await assetResolver.readAsset(recheckUri);
  } catch {
    specific = evalPath;
  }

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose("00_EXECUTE.prompt.md", specific, undefined, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function reqInventoryPatchOpenChat(): Promise<void> {
  const issueIds = await vscode.window.showInputBox({
    title: "Patch Requirements Inventory (Agent)",
    prompt: "IssueIds to patch (comma-separated), e.g. INV-BRD-001",
    placeHolder: "INV-BRD-001",
    ignoreFocusOut: true
  });

  if (!issueIds?.trim()) return;

  const scopedHeader = [
    "Execute now:",
    "",
    "Read:",
    "- docs/reports/inventory_inconsistencies/latest.md",
    "",
    "Apply a patch ONLY for the following IssueIds:",
    issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", "),
    "",
    "Then execute the patch instructions below."
  ].join("\n");

  const specific = "01_requirements/02_patch_inventory.prompt.md";
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose(
      "00_EXECUTE.prompt.md",
      specific,
      scopedHeader,
      soCtx
    );
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}
