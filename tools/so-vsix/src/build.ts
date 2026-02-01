import * as vscode from "vscode";

type Ctx = {
  request: vscode.ChatRequest;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
};

function parseSubcommand(prompt: string): string {
  const p = (prompt ?? "").trim();
  const parts = p.replace(/^@so\s+/i, "").split(/\s+/);
  const idx = parts.findIndex(x => x === "/build" || x === "build");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].toLowerCase();
  return "help";
}

async function runTaskByName(name: string) {
  const tasks = await vscode.tasks.fetchTasks();
  const t = tasks.find(x => x.name === name);
  if (!t) throw new Error(`Task not found: ${name}. Define it in .vscode/tasks.json`);
  await vscode.tasks.executeTask(t);
}

export async function runBuildCommand(ctx: Ctx): Promise<void> {
  const sub = parseSubcommand(ctx.request.prompt ?? "");

  if (sub === "render-diagrams") {
    await runTaskByName("SO: Render Diagrams (Docker)");
    ctx.stream.markdown("▶️ Started task: SO: Render Diagrams (Docker)");
    return;
  }

  if (sub === "pdf") {
    await runTaskByName("SO: Build PDF (Docker)");
    ctx.stream.markdown("▶️ Started task: SO: Build PDF (Docker)");
    return;
  }

  ctx.stream.markdown("Build commands:\n- `@so /build render-diagrams`\n- `@so /build pdf`");
}

export function registerPaletteCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.renderDiagrams", async () => {
      await runTaskByName("SO: Render Diagrams (Docker)");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.buildPdf", async () => {
      await runTaskByName("SO: Build PDF (Docker)");
    })
  );
}
