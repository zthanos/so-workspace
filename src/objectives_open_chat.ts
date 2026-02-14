import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import { loadSoAgentContext } from "./so_agent_context";

let assetResolver: AssetResolver;

export function initializeObjectivesAssetResolver(resolver: AssetResolver): void {
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

export async function objectivesGenerateOpenChat(): Promise<void> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose(
      "00_EXECUTE.prompt.md",
      "03_objectives/01_generate_objectives.prompt.md",
      undefined,
      soCtx
    );
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function objectivesEvalOpenChat(): Promise<void> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose(
      "00_EXECUTE.prompt.md",
      "03_objectives/02_eval_inconsistencies.prompt.md",
      undefined,
      soCtx
    );
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function objectivesRecheckOpenChat(): Promise<void> {
  // Prefer dedicated recheck prompt if present, else reuse eval prompt
  const recheckPath = "03_objectives/04_recheck_inconsistencies.prompt.md";
  const evalPath = "03_objectives/02_eval_inconsistencies.prompt.md";

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

export async function objectivesPatchOpenChat(): Promise<void> {
  const issueIds = await vscode.window.showInputBox({
    title: "Patch Objectives (Agent)",
    prompt: "IssueIds to patch (comma-separated), e.g. CONS-02",
    placeHolder: "CONS-02",
    ignoreFocusOut: true
  });

  if (!issueIds?.trim()) return;

  const scopedHeader = [
    "Execute now:",
    "",
    "Read:",
    "- docs/reports/objectives_inconsistencies/latest.md",
    "",
    "Apply a patch ONLY for the following IssueIds:",
    issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", "),
    "",
    "Then execute the patch instructions below."
  ].join("\n");

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose(
      "00_EXECUTE.prompt.md",
      "03_objectives/03_patch_objectives.prompt.md",
      scopedHeader,
      soCtx
    );
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}
