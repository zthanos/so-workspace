import * as vscode from "vscode";

/**
 * Run a VS Code task by its label using the built-in command.
 * This is more reliable than vscode.tasks.fetchTasks() because it lets VS Code
 * resolve workspace tasks (from .vscode/tasks.json) on demand.
 */
async function runTaskByLabel(label: string): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.tasks.runTask", label);
}

export function registerPaletteBuildCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.renderDiagrams", async () => {
      await runTaskByLabel("SO: Render Diagrams (Docker)");
      vscode.window.showInformationMessage("Started: Render Diagrams (Docker)");
    }),

    vscode.commands.registerCommand("so-workspace.buildPdf", async () => {
      await runTaskByLabel("SO: Build PDF (Docker)");
      vscode.window.showInformationMessage("Started: Build PDF (Docker)");
    })
  );
}
