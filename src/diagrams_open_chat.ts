import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";
import { loadSoAgentContext } from "./so_agent_context";

let assetResolver: AssetResolver;

export function initializeDiagramsAssetResolver(resolver: AssetResolver): void {
  assetResolver = resolver;
}

type DiagramPick = { id: string; label: string; path: string };

const DIAGRAMS: DiagramPick[] = [
  { id: "c4_context", label: "C4 Context (L1)", path: "docs/03_architecture/diagrams/src/c4_context.puml" },
  { id: "c4_container", label: "C4 Container (L2)", path: "docs/03_architecture/diagrams/src/c4_container.puml" }
];

const DIAGRAM_GENERATION_PROMPTS: Record<string, string> = {
  "c4_context": "02_diagrams/05_generate_c4_context.prompt.md",
  "c4_container": "02_diagrams/06_generate_c4_container.prompt.md"
};

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

async function pickDiagram(): Promise<DiagramPick | undefined> {
  const picked = await vscode.window.showQuickPick(
    DIAGRAMS.map(d => ({ label: d.label, description: d.path, detail: d.id })),
    { title: "Select Diagram", ignoreFocusOut: true }
  );
  if (!picked) return;
  return DIAGRAMS.find(d => d.id === picked.detail);
}

/**
 * Diagram evaluation & patch – Open Chat commands.
 *
 * Expected prompt files in repo:
 * - agent/prompts/00_EXECUTE.prompt.md
 * - agent/prompts/02_diagrams/05_generate_c4_context.prompt.md
 * - agent/prompts/02_diagrams/06_generate_c4_container.prompt.md
 * - agent/prompts/02_diagrams/07_evaluate_diagram.prompt.md
 * - agent/prompts/02_diagrams/08_patch_diagram.prompt.md
 * - agent/prompts/02_diagrams/09_recheck_diagram.prompt.md
 *
 * The prompts should read the diagram from diagram_path and write reports under:
 * docs/reports/diagram_inconsistencies/<diagram_id>/
 * plus docs/reports/diagram_inconsistencies/<diagram_id>/latest.md
 */

export async function diagramGenerateC4ContextOpenChat(): Promise<void> {
  const specific = "02_diagrams/05_generate_c4_context.prompt.md";
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

export async function diagramGenerateC4ContainerOpenChat(): Promise<void> {
  const specific = "02_diagrams/06_generate_c4_container.prompt.md";
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

export async function diagramEvalOpenChat(): Promise<void> {
  const diagram = await pickDiagram();
  if (!diagram) return;

  const specific = "02_diagrams/07_evaluate_diagram.prompt.md";
  
  const header = [
    "Execute now:",
    "",
    "Diagram selection:",
    `- diagram_id: ${diagram.id}`,
    `- diagram_path: ${diagram.path}`,
    ""
  ].join("\n");

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose("00_EXECUTE.prompt.md", specific, header, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function diagramRecheckOpenChat(): Promise<void> {
  const diagram = await pickDiagram();
  if (!diagram) return;

  const recheckPath = "02_diagrams/09_recheck_diagram.prompt.md";
  const evalPath = "02_diagrams/07_evaluate_diagram.prompt.md";

  let specific = recheckPath;
  try {
    const recheckUri = assetResolver.getPromptPath(recheckPath);
    await assetResolver.readAsset(recheckUri);
  } catch {
    specific = evalPath;
  }

  const header = [
    "Execute now:",
    "",
    "Diagram selection:",
    `- diagram_id: ${diagram.id}`,
    `- diagram_path: ${diagram.path}`,
    ""
  ].join("\n");

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const soCtx = workspaceRoot
      ? await loadSoAgentContext(workspaceRoot, assetResolver)
      : undefined;
    const prompt = await compose("00_EXECUTE.prompt.md", specific, header, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}

export async function diagramPatchOpenChat(): Promise<void> {
  const diagram = await pickDiagram();
  if (!diagram) return;

  const issueIds = await vscode.window.showInputBox({
    title: `Patch Diagram (${diagram.label})`,
    prompt: "IssueIds to patch (comma-separated), e.g. DIAG-C4-001",
    placeHolder: "DIAG-C4-001",
    ignoreFocusOut: true
  });
  if (!issueIds?.trim()) return;

  const specific = "02_diagrams/08_patch_diagram.prompt.md";

  const header = [
    "Execute now:",
    "",
    "Read:",
    `- docs/reports/diagram_inconsistencies/${diagram.id}/latest.md`,
    "",
    "Diagram selection:",
    `- diagram_id: ${diagram.id}`,
    `- diagram_path: ${diagram.path}`,
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
    const prompt = await compose("00_EXECUTE.prompt.md", specific, header, soCtx);
    await openChatWithPrompt(prompt);
  } catch (error) {
    console.error(`Failed to load prompt: ${specific}`, error);
    vscode.window.showErrorMessage(
      `Failed to load required prompt file. Please try reinstalling the extension.`
    );
  }
}
