import * as vscode from "vscode";
import { readText, writeText, exists, isoStampForFilename } from "./fsutil";
import { getChatModel, sendToModel } from "./lm";

type Ctx = {
  request: vscode.ChatRequest;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  model?: vscode.LanguageModelChat;
};

function parseSubcommand(prompt: string): string {
  // Expected:
  // "/objectives generate" | "/objectives eval" | "/objectives patch" | "/objectives recheck"
  const p = prompt.trim();
  const parts = p.replace(/^@so\s+/i, "").split(/\s+/);
  const idx = parts.findIndex(x => x === "/objectives" || x === "objectives");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].toLowerCase();
  // Sometimes request.prompt might be empty and request.command is set; keep safe default:
  return "help";
}

async function ensureReportsFolders() {
  // We just write files; folders are created implicitly by VS Code fs? Not always.
  // Simpler: we rely on existing repo folders. If missing, instruct user.
  const ok = await exists("docs/build/reports");
  if (!ok) throw new Error("Missing folder docs/build/reports. Create it in the repo.");
  const ok2 = await exists("docs/build/reports/inconsistencies");
  if (!ok2) {
    // Create folder by writing a placeholder then deleting is annoying; better: ask user to create it once.
    throw new Error("Missing folder docs/build/reports/inconsistencies. Create it in the repo.");
  }
}

async function runPromptFile(model: vscode.LanguageModelChat, basePromptRel: string, specificPromptRel: string, token: vscode.CancellationToken): Promise<string> {
  const base = await readText(basePromptRel);
  const spec = await readText(specificPromptRel);
  const final = `${base}\n\n${spec}`;
  const system = "You are executing a deterministic repository documentation workflow. Follow instructions exactly and do not add commentary.";
  return await sendToModel(model, system, final, token);
}

export async function runObjectivesCommand(ctx: Ctx): Promise<void> {
  const { request, stream, token } = ctx;
  const prompt = (request.prompt ?? "").trim();
  const sub = parseSubcommand(prompt);

  const model = await getChatModel(ctx.model);

  if (sub === "generate") {
    const out = await runPromptFile(
      model,
      "docs/agent/prompts/00_EXECUTE.prompt.md",
      "docs/agent/prompts/01_generate_objectives.prompt.md",
      token
    );

    await writeText("docs/01_objectives/objectives.md", out);
    stream.markdown("✅ Wrote `docs/01_objectives/objectives.md`");
    stream.button({
      command: "vscode.open",
      title: "Open objectives.md",
      arguments: [vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "docs/01_objectives/objectives.md")]
    });
    return;
  }

  if (sub === "eval") {
    await ensureReportsFolders();

    const out = await runPromptFile(
      model,
      "docs/agent/prompts/00_EXECUTE.prompt.md",
      "docs/agent/prompts/02_eval_inconsistencies_versioned.prompt.md",
      token
    );

    // Write latest
    await writeText("docs/build/reports/inconsistencies/latest.md", out);

    // Write snapshot
    const stamp = isoStampForFilename(new Date());
    const snap = `docs/build/reports/inconsistencies/${stamp}_eval.md`;
    await writeText(snap, out);

    stream.markdown(`✅ Wrote \`docs/build/reports/inconsistencies/latest.md\`\n✅ Snapshot: \`${snap}\``);
    stream.button({
      command: "vscode.open",
      title: "Open latest report",
      arguments: [vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "docs/build/reports/inconsistencies/latest.md")]
    });
    return;
  }

  if (sub === "patch") {
    // v1: ask IssueIds interactively (no typing in chat required)
    const issueIds = await vscode.window.showInputBox({
      title: "Patch Objectives",
      prompt: "IssueIds to patch (comma-separated), e.g. CONS-02",
      placeHolder: "CONS-02",
      ignoreFocusOut: true
    });

    if (!issueIds?.trim()) {
      stream.markdown("ℹ️ No IssueIds provided. Nothing to patch.");
      return;
    }

    // Build a scoped instruction, then run the patch prompt.
    const base = await readText("docs/agent/prompts/00_EXECUTE.prompt.md");
    const patch = await readText("docs/agent/prompts/03_patch_objectives.prompt.md");

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

    const final = `${base}\n\n${scopedHeader}\n\n${patch}`;
    const system = "You are applying a minimal, scoped patch. Modify only objectives.md. Do not change other files. No extra commentary.";

    const out = await sendToModel(model, system, final, token);
    await writeText("docs/01_objectives/objectives.md", out);

    stream.markdown(`✅ Patched objectives for IssueIds: ${issueIds}\nWrote \`docs/01_objectives/objectives.md\``);
    return;
  }

  if (sub === "recheck") {
    await ensureReportsFolders();

    // If you already have a dedicated 04 prompt, use it; otherwise reuse eval v2.
    const promptPath = (await exists("docs/agent/prompts/04_recheck_inconsistencies.prompt.md"))
      ? "docs/agent/prompts/04_recheck_inconsistencies.prompt.md"
      : "docs/agent/prompts/02_eval_inconsistencies_versioned.prompt.md";

    const out = await runPromptFile(model, "docs/agent/prompts/00_EXECUTE.prompt.md", promptPath, token);

    await writeText("docs/build/reports/inconsistencies/latest.md", out);

    const stamp = isoStampForFilename(new Date());
    const snap = `docs/build/reports/inconsistencies/${stamp}_recheck.md`;
    await writeText(snap, out);

    stream.markdown(`✅ Recheck complete\n✅ Updated latest\n✅ Snapshot: \`${snap}\``);
    return;
  }

  stream.markdown(
    [
      "Objectives commands:",
      "- `@so /objectives generate`",
      "- `@so /objectives eval`",
      "- `@so /objectives patch`",
      "- `@so /objectives recheck`"
    ].join("\n")
  );
}
