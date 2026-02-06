import { readText, exists } from "./fsutil";
import { openChatWithPrompt } from "./chat_open";
import { wrapForAgent } from "./prompt_envelope";
import * as vscode from "vscode";

async function compose(baseRel: string, specificRel: string, extraHeader?: string): Promise<string> {
  const base = await readText(baseRel);
  const spec = await readText(specificRel);
  const combined = extraHeader ? `${base}\n\n${extraHeader}\n\n${spec}` : `${base}\n\n${spec}`;
  return wrapForAgent(combined);
}

/**
 * Solution Outline generation & evaluation – Open Chat commands.
 *
 * Expected prompt files in repo:
 * - docs/agent/prompts/00_EXECUTE.prompt.md
 * - docs/agent/prompts/04_solution_outline/20_generate_solution_outline.prompt.md
 * - docs/agent/prompts/04_solution_outline/21_evaluate_solution_outline.prompt.md
 * - docs/agent/prompts/04_solution_outline/22_patch_solution_outline.prompt.md
 * - docs/agent/prompts/04_solution_outline/24_final_review_solution_outline.prompt.md
 */
export async function soGenerateOpenChat(): Promise<void> {
  const specific = "docs/agent/prompts/04_solution_outline/20_generate_solution_outline.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
}

export async function soEvalOpenChat(): Promise<void> {
  const specific = "docs/agent/prompts/04_solution_outline/21_evaluate_solution_outline.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
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
    "- docs/build/reports/so_inconsistencies/latest.md",
    "",
    "Apply a patch ONLY for the following IssueIds:",
    issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", "),
    "",
    "Then execute the patch instructions below."
  ].join("\n");

  const specific = "docs/agent/prompts/04_solution_outline/22_patch_solution_outline.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }

  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific, scopedHeader);
  await openChatWithPrompt(prompt);
}

export async function soFinalReviewOpenChat(): Promise<void> {
  const specific = "docs/agent/prompts/04_solution_outline/24_final_review_solution_outline.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("docs/agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
}
