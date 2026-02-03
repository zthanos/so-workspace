import { readText, exists } from "./fsutil";
import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";

type DiagramPick = { id: string; label: string; path: string };

const DIAGRAMS: DiagramPick[] = [
  { id: "c4_context", label: "C4 Context (L1)", path: "docs/03_diagrams/c4_context.puml" },
  { id: "c4_container", label: "C4 Container (L2)", path: "docs/03_diagrams/c4_container.puml" }
];

async function compose(baseRel: string, specificRel: string, extraHeader?: string): Promise<string> {
  const base = await readText(baseRel);
  const spec = await readText(specificRel);
  const combined = extraHeader ? `${base}\n\n${extraHeader}\n\n${spec}` : `${base}\n\n${spec}`;
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
 * - docs/agent/prompts/00_EXECUTE.prompt.md
 * - docs/agent/prompts/20_eval_diagram.prompt.md
 * - docs/agent/prompts/21_patch_diagram.prompt.md
 * - docs/agent/prompts/22_recheck_diagram.prompt.md
 *
 * The prompts should read the diagram from diagram_path and write reports under:
 * docs/build/reports/diagram_inconsistencies/<diagram_id>/
 * plus docs/build/reports/diagram_inconsistencies/<diagram_id>/latest.md
 */
export async function diagramEvalOpenChat(): Promise<void> {
  const diagram = await pickDiagram();
  if (!diagram) return;

  const specific = "docs/agent/prompts/20_eval_diagram.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }

  const header = [
    "Execute now:",
    "",
    "Diagram selection:",
    `- diagram_id: ${diagram.id}`,
    `- diagram_path: ${diagram.path}`,
    ""
  ].join("\n");

  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific, header);
  await openChatWithPrompt(prompt);
}

export async function diagramRecheckOpenChat(): Promise<void> {
  const diagram = await pickDiagram();
  if (!diagram) return;

  const specific = (await exists("docs/agent/prompts/22_recheck_diagram.prompt.md"))
    ? "docs/agent/prompts/22_recheck_diagram.prompt.md"
    : "docs/agent/prompts/20_eval_diagram.prompt.md";

  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }

  const header = [
    "Execute now:",
    "",
    "Diagram selection:",
    `- diagram_id: ${diagram.id}`,
    `- diagram_path: ${diagram.path}`,
    ""
  ].join("\n");

  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific, header);
  await openChatWithPrompt(prompt);
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

  const specific = "docs/agent/prompts/21_patch_diagram.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }

  const header = [
    "Execute now:",
    "",
    "Read:",
    `- docs/build/reports/diagram_inconsistencies/${diagram.id}/latest.md`,
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

  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific, header);
  await openChatWithPrompt(prompt);
}
