import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slash-command mode: @so /generate, @so /eval, @so /patch ..., @so /recheck */
async function openSoCommand(command: string, text?: string): Promise<void> {
  const query = text ? `@so /${command} ${text}` : `@so /${command}`;
  await vscode.commands.executeCommand("workbench.action.chat.open", { query });
}

// ---------------------------------------------------------------------------
// Slash-command workflow  (Command Palette: SO: 2-01 ... 2-04)
// ---------------------------------------------------------------------------

export async function objectivesGenerateOpenChat(): Promise<void> {
  await openSoCommand("generate");
}

export async function objectivesEvalOpenChat(): Promise<void> {
  await openSoCommand("eval");
}

export async function objectivesRecheckOpenChat(): Promise<void> {
  await openSoCommand("recheck");
}

export async function objectivesPatchOpenChat(): Promise<void> {
  const issueIds = await vscode.window.showInputBox({
    title: "Patch Objectives (Agent)",
    prompt: "IssueIds to patch (comma-separated), e.g. CONS-02",
    placeHolder: "CONS-02",
    ignoreFocusOut: true,
  });

  if (!issueIds?.trim()) { return; }

  const ids = issueIds.split(",").map(x => x.trim()).filter(Boolean).join(", ");
  await openSoCommand("patch", `IssueIds: ${ids}`);
}