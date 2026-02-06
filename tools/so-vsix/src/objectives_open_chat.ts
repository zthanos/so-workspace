import { readText } from "./fsutil";
import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";

async function compose(baseRel: string, specificRel: string, extraHeader?: string): Promise<string> {
  const base = await readText(baseRel);
  const spec = await readText(specificRel);
  const combined = extraHeader ? `${base}\n\n${extraHeader}\n\n${spec}` : `${base}\n\n${spec}`;
  return wrapForAgent(combined);
}

export async function objectivesGenerateOpenChat(): Promise<void> {
  const prompt = await compose(
    "docs/agent/prompts/00_EXECUTE.prompt.md",
    "docs/agent/prompts/03_objectives/01_generate_objectives.prompt.md"
  );
  await openChatWithPrompt(prompt);
}

export async function objectivesEvalOpenChat(): Promise<void> {
  const prompt = await compose(
    "docs/agent/prompts/00_EXECUTE.prompt.md",
    "docs/agent/prompts/03_objectives/02_eval_inconsistencies.prompt.md"
  );
  await openChatWithPrompt(prompt);
}

export async function objectivesRecheckOpenChat(): Promise<void> {
  // Prefer dedicated recheck prompt if present, else reuse eval prompt
  const recheckPath = "docs/agent/prompts/03_objectives/04_recheck_inconsistencies.prompt.md";
  const evalPath = "docs/agent/prompts/03_objectives/02_eval_inconsistencies.prompt.md";

  // We can't "exists" without importing; simplest: just try recheck first.
  let specific = recheckPath;
  try {
    await readText(recheckPath);
  } catch {
    specific = evalPath;
  }

  const prompt = await compose(
    "docs/agent/prompts/00_EXECUTE.prompt.md",
    specific
  );
  await openChatWithPrompt(prompt);
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
    "- docs/build/reports/inconsistencies/latest.md",
    "",
    "Apply a patch ONLY for the following IssueIds:",
    issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", "),
    "",
    "Then execute the patch instructions below."
  ].join("\n");

  const prompt = await compose(
    "docs/agent/prompts/00_EXECUTE.prompt.md",
    "docs/agent/prompts/03_objectives/03_patch_objectives.prompt.md",
    scopedHeader
  );

  await openChatWithPrompt(prompt);
}
