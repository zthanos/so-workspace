import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import { loadSoAgentContext } from "./so_agent_context";

let assetResolver: AssetResolver;

export function initializeSolutionOutlineAssetResolver(resolver: AssetResolver): void {
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
 * Solution Outline generation & evaluation – Open Chat commands.
 *
 * Expected prompt files in repo:
 * - agent/prompts/00_EXECUTE.prompt.md
 * - agent/prompts/04_solution_outline/20_generate_solution_outline.prompt.md
 * - agent/prompts/04_solution_outline/21_evaluate_solution_outline.prompt.md
 * - agent/prompts/04_solution_outline/22_patch_solution_outline.prompt.md
 * - agent/prompts/04_solution_outline/24_final_review_solution_outline.prompt.md
 */
export async function soGenerateOpenChat(): Promise<void> {
  const specific = "04_solution_outline/20_generate_solution_outline.prompt.md";
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

export async function soEvalOpenChat(): Promise<void> {
  const specific = "04_solution_outline/21_evaluate_solution_outline.prompt.md";
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

export async function soPatchOpenChat(): Promise<void> {
  const issueIds = await vscode.window.showInputBox({
    title: "Patch Solution Outline (Agent)",
    prompt: "IssueIds to patch (comma-separated), e.g. SO-OBJ-001",
    placeHolder: "SO-OBJ-001",
    ignoreFocusOut: true
  });
  if (!issueIds?.trim()) return;

  const scopedHeader = [
    "Execute now:",
    "",
    "Read:",
    "- docs/reports/solution_outline_inconsistencies/latest.md",
    "",
    "Apply a patch ONLY for the following IssueIds:",
    issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", "),
    "",
    "Then execute the patch instructions below."
  ].join("\n");

  const specific = "04_solution_outline/22_patch_solution_outline.prompt.md";
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

export async function soFinalReviewOpenChat(): Promise<void> {
  const specific = "04_solution_outline/24_final_review_solution_outline.prompt.md";
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
