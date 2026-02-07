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
  const specific = "agent/prompts/01_requirements/00_extract_requirements_inventory.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
}

export async function reqInventoryEvalOpenChat(): Promise<void> {
  const specific = "agent/prompts/01_requirements/01_evaluate_inventory.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
}

export async function reqInventoryRecheckOpenChat(): Promise<void> {
  const specific = (await exists("agent/prompts/01_requirements/03_recheck_inventory.prompt.md"))
    ? "agent/prompts/01_requirements/03_recheck_inventory.prompt.md"
    : "agent/prompts/01_requirements/01_evaluate_inventory.prompt.md";

  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }
  const prompt = await compose("agent/prompts/00_EXECUTE.prompt.md", specific);
  await openChatWithPrompt(prompt);
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

  const specific = "agent/prompts/01_requirements/02_patch_inventory.prompt.md";
  if (!(await exists(specific))) {
    vscode.window.showErrorMessage(`Missing prompt file: ${specific}`);
    return;
  }

  const prompt = await compose("agent/prompts/00_EXECUTE.prompt.md", specific, scopedHeader);
  await openChatWithPrompt(prompt);
}
