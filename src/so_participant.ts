import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

// ---------------------------------------------------------------------------
// Paths (relative to workspace root)
// ---------------------------------------------------------------------------

const AGENT_CONTEXT_PATH = ".github/so_agent_context.md";

const SKILLS: Record<string, string> = {
  "requirements-inventory": ".github/skills/requirements-inventory/skill.md",
};

const SKILL_RESOURCES: Record<string, string[]> = {
  "requirements-inventory": [
    ".github/skills/requirements-inventory/resources/methodology.md",
    ".github/skills/requirements-inventory/resources/output-template.md",
    ".github/skills/requirements-inventory/resources/taxonomy.md",
  ],
};

const AUTHORITATIVE_ARTIFACTS: Record<string, string> = {
  objectives:       "docs/02_objectives/objectives.md",
  requirements:     "docs/01_requirements/requirements.inventory.md",
  template:         "assets/templates/solution_outline.template.md",
  solutionOutline:  "docs/03_architecture/solution_outline.md",
};

const CONTEXT_ARTIFACTS: Record<string, string> = {
  brd:         "docs/00_brd/brd.md",
  discussions: "docs/98_discussions",
  references:  "docs/99_references",
  adrs:        "docs/03_architecture/adr",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function readDirMarkdownFiles(dirPath: string): Promise<{ file: string; content: string }[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results: { file: string; content: string }[] = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = await readFileSafe(path.join(dirPath, entry.name));
        if (content) {
          results.push({ file: entry.name, content });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Slash command → intent mapping
// ---------------------------------------------------------------------------

type SlashIntent = "generate" | "eval" | "patch" | "recheck" | null;

function resolveSlashIntent(command: string | undefined): SlashIntent {
  switch (command) {
    case "generate": return "generate";
    case "eval":     return "eval";
    case "patch":    return "patch";
    case "recheck":  return "recheck";
    default:         return null;
  }
}

/**
 * Detect which skill is most relevant based on slash command or message keywords.
 */
function detectSkill(message: string, command?: string): string | null {
  if (command && ["generate", "eval", "patch", "recheck"].includes(command)) {
    return "requirements-inventory";
  }
  const lower = message.toLowerCase();
  if (
    lower.includes("requirement") ||
    lower.includes("inventory") ||
    lower.includes("brd") ||
    lower.includes("ri-") ||
    lower.includes("actor") ||
    lower.includes("stakeholder") ||
    lower.includes("non-functional") ||
    lower.includes("nfr") ||
    lower.includes("constraint")
  ) {
    return "requirements-inventory";
  }
  return null;
}

/**
 * Build an intent-specific instruction to append when a slash command is used.
 */
function buildSlashIntentInstruction(intent: SlashIntent, skillId: string | null, promptText?: string): string {
  if (!intent) { return ""; }
  const artifact = skillId === "requirements-inventory"
    ? "`docs/01_requirements/requirements.inventory.md`"
    : "the relevant artifact";
  switch (intent) {
    case "generate":
      return "\n\n> **Slash command: /generate**\nExtract and create " + artifact + " from the BRD. Follow Step 1 (Extract) of the skill workflow.";
    case "eval":
      return "\n\n> **Slash command: /eval**\nEvaluate " + artifact + " against the BRD. Follow Step 2 (Evaluate) and produce a report at `docs/reports/inventory_inconsistencies/latest.md`.";
    case "patch": {
      // Extra text may contain scoped IssueIds passed from the command (e.g. "IssueIds: INV-BRD-001")
      const scopeHint = promptText?.includes("IssueIds:")
        ? `\nScope: apply fixes ONLY for the following IssueIds: ${promptText.replace(/.*IssueIds:/i, "").trim()}`
        : "";
      return "\n\n> **Slash command: /patch**\nApply minimal fixes to " + artifact + " based on \`docs/reports/inventory_inconsistencies/latest.md\`. Follow Step 3 (Patch)." + scopeHint;
    }
    case "recheck":
      return "\n\n> **Slash command: /recheck**\nRe-evaluate the patched " + artifact + " and update the report. Follow Step 4 (Recheck).";
  }
}

/**
 * Build the full system prompt from agent context, optional skill, and loaded artifacts.
 */
async function buildSystemPrompt(
  workspaceRoot: string,
  skillId: string | null
): Promise<string> {
  const parts: string[] = [];

  // 1. Agent context
  const agentContext = await readFileSafe(path.join(workspaceRoot, AGENT_CONTEXT_PATH));
  if (agentContext) {
    parts.push("# Agent Context\n\n" + agentContext);
  }

  // 2. Skill (if detected)
  if (skillId && SKILLS[skillId]) {
    const skillContent = await readFileSafe(path.join(workspaceRoot, SKILLS[skillId]));
    if (skillContent) {
      parts.push(`# Active Skill: ${skillId}\n\n` + skillContent);
    }
    // Skill resources
    const resources = SKILL_RESOURCES[skillId] ?? [];
    for (const resourcePath of resources) {
      const content = await readFileSafe(path.join(workspaceRoot, resourcePath));
      if (content) {
        const resourceName = path.basename(resourcePath, ".md");
        parts.push(`## Skill Resource: ${resourceName}\n\n` + content);
      }
    }
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Load workspace artifacts relevant to the current request and append them
 * as context messages.
 */
async function loadArtifactContext(
  workspaceRoot: string,
  skillId: string | null
): Promise<vscode.LanguageModelChatMessage[]> {
  const messages: vscode.LanguageModelChatMessage[] = [];
  const loadedFiles: string[] = [];

  async function addFile(label: string, relPath: string) {
    const content = await readFileSafe(path.join(workspaceRoot, relPath));
    if (content) {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `<artifact label="${label}" path="${relPath}">\n${content}\n</artifact>`
        )
      );
      loadedFiles.push(relPath);
    }
  }

  // Always load objectives and requirements if they exist
  await addFile("Objectives", AUTHORITATIVE_ARTIFACTS.objectives);
  await addFile("Requirements Inventory", AUTHORITATIVE_ARTIFACTS.requirements);

  // Requirements-inventory skill: also load BRD
  if (skillId === "requirements-inventory") {
    await addFile("BRD", CONTEXT_ARTIFACTS.brd);
  }

  // Load solution outline if it exists
  await addFile("Solution Outline", AUTHORITATIVE_ARTIFACTS.solutionOutline);

  // Load discussions
  const discussions = await readDirMarkdownFiles(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.discussions)
  );
  for (const { file, content } of discussions) {
    messages.push(
      vscode.LanguageModelChatMessage.User(
        `<artifact label="Discussion: ${file}" path="docs/98_discussions/${file}">\n${content}\n</artifact>`
      )
    );
    loadedFiles.push(`docs/98_discussions/${file}`);
  }

  // Load ADRs
  const adrs = await readDirMarkdownFiles(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.adrs)
  );
  for (const { file, content } of adrs) {
    messages.push(
      vscode.LanguageModelChatMessage.User(
        `<artifact label="ADR: ${file}" path="docs/03_architecture/adr/${file}">\n${content}\n</artifact>`
      )
    );
    loadedFiles.push(`docs/03_architecture/adr/${file}`);
  }

  if (loadedFiles.length > 0) {
    messages.unshift(
      vscode.LanguageModelChatMessage.User(
        `The following workspace artifacts have been loaded as context:\n${loadedFiles.map(f => `- ${f}`).join("\n")}\n\nUse them as authoritative input according to the agent context rules.`
      )
    );
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Participant handler
// ---------------------------------------------------------------------------

async function soParticipantHandler(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {

  // Resolve workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    stream.markdown("⚠️ No workspace folder is open. Please open a workspace to use the SO assistant.");
    return {};
  }
  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  // Resolve slash command and skill
  const slashCommand = request.command;
  const slashIntent  = resolveSlashIntent(slashCommand);
  const skillId      = detectSkill(request.prompt, slashCommand);

  // Show active skill / command in chat
  const badges: string[] = [];
  if (slashCommand) { badges.push(`⚡ **/${slashCommand}**`); }
  if (skillId)      { badges.push(`🛠️ skill: \`${skillId}\``); }
  if (badges.length > 0) {
    stream.markdown(`> ${badges.join(" · ")}\n\n`);
  }

  // Build system prompt
  const systemPrompt = await buildSystemPrompt(workspaceRoot, skillId);

  // Load artifact context messages
  const artifactMessages = await loadArtifactContext(workspaceRoot, skillId);

  // Select model
  const [model] = await vscode.lm.selectChatModels({
    vendor: "copilot",
    family: "gpt-4o",
  });

  if (!model) {
    stream.markdown("⚠️ No compatible language model available. Please ensure GitHub Copilot is active.");
    return {};
  }

  // Build message history from prior turns
  const history: vscode.LanguageModelChatMessage[] = [];
  for (const turn of context.history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      history.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .filter((r): r is vscode.ChatResponseMarkdownPart => r instanceof vscode.ChatResponseMarkdownPart)
        .map(r => r.value.value)
        .join("");
      if (text) {
        history.push(vscode.LanguageModelChatMessage.Assistant(text));
      }
    }
  }

  // Assemble final messages
  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    ...artifactMessages,
    ...history,
    vscode.LanguageModelChatMessage.User(request.prompt + buildSlashIntentInstruction(slashIntent, skillId, request.prompt)),
  ];

  // Stream response
  try {
    const response = await model.sendRequest(messages, {}, token);
    for await (const chunk of response.text) {
      stream.markdown(chunk);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stream.markdown(`\n\n⚠️ Error communicating with model: ${msg}`);
  }

  return {};
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSoParticipant(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(
    "so-workspace.so",
    soParticipantHandler
  );

  // Icon (reuse extension icon if present)
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets", "icon.png");

  context.subscriptions.push(participant);
}