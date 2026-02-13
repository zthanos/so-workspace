import * as vscode from "vscode";

export async function openChatWithPrompt(prompt: string): Promise<void> {
  // Opens VS Code Chat view with prompt pre-filled.
  // User presses Enter; Agent mode will use workspace context and do file writes.
  await vscode.commands.executeCommand("workbench.action.chat.open", prompt);
}
