import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import {
  loadSkillConfig, SkillConfig, SkillOperation,
  matchDiagramFromPrompt, getDiagramById, resolvePromptKey,
  DiagramCatalogEntry,
} from "./skill-loader";
import { AssetResolver } from "./asset-resolver";

// ---------------------------------------------------------------------------
// Paths (relative to workspace root)
// ---------------------------------------------------------------------------

const AGENT_CONTEXT_PATH    = ".github/so_agent_context.md";
const WORKSPACE_RULES_PATH  = ".github/rules";
const WORKSPACE_SKILLS_PATH = ".github/skills";

const AUTHORITATIVE_ARTIFACTS: Record<string, string> = {
  objectives:      "docs/02_objectives/objectives.md",
  requirements:    "docs/01_requirements/requirements.inventory.md",
  solutionOutline: "docs/03_architecture/solution_outline.md",
};

const CONTEXT_ARTIFACTS: Record<string, string> = {
  brd:         "docs/00_brd/brd.md",
  discussions: "docs/98_discussions",
  references:  "docs/99_references",
  adrs:        "docs/03_architecture/adr",
};

// Rule files packaged in assets/agent/rules/ (loaded for every request)
const RULE_FILES = [
  "rules.yaml",
  "system_categories.yaml",
  "zones.yaml",
  "integration-routing-rules.yaml",
  "integration-style-rules.yaml",
  "observability-security-rules.yaml",
] as const;

// All known skill folders (source of truth: assets/skills/)
const ALL_SKILL_FOLDERS = [
  "requirements-inventory",
  "objectives",
  "diagrams",
  "solution-outline",
  "architecture-decision-records",
] as const;

// Maps slash operation name → prompt file name (without .prompt.md)
const OPERATION_TO_PROMPT: Record<string, string> = {
  generate: "generate",
  eval:     "evaluate",
  patch:    "patch",
  recheck:  "recheck",
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

async function readDirMarkdownFiles(
  dirPath: string
): Promise<{ file: string; content: string }[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results: { file: string; content: string }[] = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = await readFileSafe(path.join(dirPath, entry.name));
        if (content) results.push({ file: entry.name, content });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Skill detection
// ---------------------------------------------------------------------------

/**
 * Detect which skill folder to activate.
 *
 * Priority:
 * 1. Explicit diagram_id param in prompt  → "diagrams"
 * 2. Keyword matching against each skill's name/description (loaded from skill.md)
 * 3. Slash command alone (generate/eval/patch/recheck) → "requirements-inventory" as default
 */
async function detectSkill(
  prompt: string,
  command: string | undefined,
  assetResolver: AssetResolver
): Promise<string | null> {
  const lower = prompt.toLowerCase();

  // 1. Explicit diagram_id in prompt (set by skill_open_chat.ts)
  if (lower.includes("diagram_id:")) {
    return "diagrams";
  }

  // 2. Keyword matching — load all skill configs and score against prompt
  const scores: { folder: string; score: number }[] = [];

  for (const folder of ALL_SKILL_FOLDERS) {
    try {
      const config = await loadSkillConfig(folder);
      let score = 0;

      // Match against skill name words
      for (const word of config.name.toLowerCase().split(/\W+/).filter(Boolean)) {
        if (word.length > 3 && lower.includes(word)) score += 2;
      }

      // Match against skill id parts
      for (const part of config.id.toLowerCase().split(/[-_]/).filter(Boolean)) {
        if (part.length > 3 && lower.includes(part)) score += 1;
      }

      // Match against description words (lower weight)
      for (const word of config.description.toLowerCase().split(/\W+/).filter(Boolean)) {
        if (word.length > 5 && lower.includes(word)) score += 0.5;
      }

      // Match against diagramCatalog labels (high weight — explicit diagram type names)
      if (config.diagramCatalog) {
        for (const entry of config.diagramCatalog) {
          for (const label of entry.labels) {
            if (lower.includes(label.toLowerCase())) score += 3;
          }
        }
      }

      if (score > 0) scores.push({ folder, score });
    } catch {
      // skill.md unreadable — skip
    }
  }

  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score);
    return scores[0].folder;
  }

  // 3. Slash command present but no keyword match → default to requirements-inventory
  if (command && ["generate", "eval", "patch", "recheck"].includes(command)) {
    return "requirements-inventory";
  }

  return null;
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

async function buildSystemPrompt(
  workspaceRoot: string,
  skillFolder: string | null,
  assetResolver: AssetResolver
): Promise<string> {
  const parts: string[] = [];

  // 1. Agent context (workspace-level, overrides extension baseline)
  const agentContext = await readFileSafe(path.join(workspaceRoot, AGENT_CONTEXT_PATH));
  if (agentContext) {
    parts.push("# Agent Context\n\n" + agentContext);
  }

  // 2. EA rules — workspace overrides extension baseline (file-by-file)
  const rulesParts: string[] = [];
  for (const ruleFile of RULE_FILES) {
    // Try workspace first (.github/rules/<file>), fallback to extension asset
    const workspaceRuleContent = await readFileSafe(
      path.join(workspaceRoot, WORKSPACE_RULES_PATH, ruleFile)
    );
    if (workspaceRuleContent) {
      const label = ruleFile.replace(".yaml", "");
      rulesParts.push(`### ${label} (workspace)\n\`\`\`yaml\n${workspaceRuleContent}\n\`\`\``);
      continue;
    }
    try {
      const ruleUri = assetResolver.getRulePath(ruleFile);
      const ruleContent = await assetResolver.readAsset(ruleUri);
      const label = ruleFile.replace(".yaml", "");
      rulesParts.push(`### ${label}\n\`\`\`yaml\n${ruleContent}\n\`\`\``);
    } catch {
      // Rule file missing in both locations — skip
    }
  }
  if (rulesParts.length > 0) {
    parts.push("# Enterprise Architecture Rules\n\n" + rulesParts.join("\n\n"));
  }

  // 3. Active skill — workspace overrides extension baseline (skill.md + resources)
  if (skillFolder) {
    try {
      const config = await loadSkillConfig(skillFolder);

      // skill.md: workspace version takes precedence over extension
      const wsSkillContent = await readFileSafe(
        path.join(workspaceRoot, WORKSPACE_SKILLS_PATH, skillFolder, "skill.md")
      );
      const skillContent = wsSkillContent
        ?? await assetResolver.readAsset(assetResolver.getSkillPath(`${skillFolder}/skill.md`));
      const origin = wsSkillContent ? " (workspace)" : "";
      parts.push(`# Active Skill: ${config.name}${origin}\n\n` + skillContent);

      // Resources: workspace version takes precedence over extension, file-by-file
      const resourceFiles = ["methodology.md", "output-template.md", "taxonomy.md", "mapping-rules.md", "review-rules.md", "section-guidelines.md", "registry-guidelines.md", "diagram-taxonomy.md", "adr-template.md", "decision-guidelines.md", "evaluation-rules.md"];
      for (const resFile of resourceFiles) {
        const wsResContent = await readFileSafe(
          path.join(workspaceRoot, WORKSPACE_SKILLS_PATH, skillFolder, "resources", resFile)
        );
        if (wsResContent) {
          const label = path.basename(resFile, ".md");
          parts.push(`## Skill Resource: ${label} (workspace)\n\n` + wsResContent);
          continue;
        }
        try {
          const resUri = assetResolver.getSkillPath(`${skillFolder}/resources/${resFile}`);
          const resContent = await assetResolver.readAsset(resUri);
          const label = path.basename(resFile, ".md");
          parts.push(`## Skill Resource: ${label}\n\n` + resContent);
        } catch {
          // Resource doesn't exist for this skill — skip
        }
      }
    } catch {
      // skill.md unreadable — skip
    }
  }

  return parts.join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Operation prompt loader
// ---------------------------------------------------------------------------

/**
 * Loads the operation-specific prompt from the skill's resources/prompts/ folder.
 *
 * For diagram skills: resolves the correct promptKey from diagramCatalog
 * (e.g. generate_c4_context, evaluate_mermaid) based on diagram_id in extraParams
 * or by matching catalog labels against the user prompt.
 *
 * Falls back to a generic instruction if no prompt file is found.
 */
async function loadOperationPrompt(
  skillFolder: string,
  operation: SkillOperation,
  assetResolver: AssetResolver,
  extraParams?: string,
  userPrompt?: string
): Promise<string> {
  const config = await loadSkillConfig(skillFolder);

  // Resolve diagram catalog entry if applicable
  let catalogEntry: DiagramCatalogEntry | undefined;
  if (config.diagramCatalog) {
    // Try diagram_id from extraParams first (explicit, from QuickPick)
    const diagramIdMatch = extraParams?.match(/diagram_id:\s*(\S+)/i);
    if (diagramIdMatch) {
      catalogEntry = getDiagramById(config, diagramIdMatch[1]);
    }
    // Fallback: match from user prompt labels
    if (!catalogEntry && userPrompt) {
      catalogEntry = matchDiagramFromPrompt(config, userPrompt);
    }
  }

  // Build candidate prompt file names in priority order
  const candidates: string[] = [];

  if (catalogEntry) {
    // Use catalog-resolved promptKey for this operation
    candidates.push(resolvePromptKey(catalogEntry, operation));
  }

  // Generic operation fallback (e.g. "evaluate", "patch")
  candidates.push(OPERATION_TO_PROMPT[operation] ?? operation);

  // Try workspace override first, then extension asset
  for (const candidate of candidates) {
    // Workspace override: .github/skills/<folder>/resources/prompts/<candidate>.prompt.md
    if (userPrompt) { // userPrompt presence implies we have workspaceRoot available via closure
      // Note: workspaceRoot is not available here — workspace override handled in so_participant
    }
    try {
      const uri = assetResolver.getSkillPath(
        `${skillFolder}/resources/prompts/${candidate}.prompt.md`
      );
      const content = await assetResolver.readAsset(uri);
      if (content) return content;
    } catch {
      // Try next candidate
    }
  }

  // Fallback: generic instruction
  return buildGenericOperationInstruction(operation, extraParams);
}

function buildGenericOperationInstruction(
  operation: SkillOperation,
  extraParams?: string
): string {
  const scopeHint = extraParams?.includes("IssueIds:")
    ? `\nScope: apply fixes ONLY for the following IssueIds: ${extraParams.replace(/.*IssueIds:/i, "").trim()}`
    : "";

  switch (operation) {
    case "generate": return "Execute the generate operation. Create or update the primary artifact according to the skill methodology.";
    case "eval":     return "Execute the evaluate operation. Assess the primary artifact for inconsistencies and produce a report.";
    case "patch":    return `Execute the patch operation. Apply minimal corrections based on the latest inconsistency report.${scopeHint}`;
    case "recheck":  return "Execute the recheck operation. Re-evaluate the patched artifact using the same evaluation criteria.";
    default:         return `Execute operation: ${operation}.`;
  }
}

// ---------------------------------------------------------------------------
// Artifact context loader
// ---------------------------------------------------------------------------

async function loadArtifactContext(
  workspaceRoot: string,
  skillFolder: string | null
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

  // Always load core artifacts if they exist
  await addFile("Objectives",             AUTHORITATIVE_ARTIFACTS.objectives);
  await addFile("Requirements Inventory", AUTHORITATIVE_ARTIFACTS.requirements);
  await addFile("Solution Outline",       AUTHORITATIVE_ARTIFACTS.solutionOutline);

  // BRD only for requirements-inventory skill
  if (skillFolder === "requirements-inventory") {
    await addFile("BRD", CONTEXT_ARTIFACTS.brd);
  }

  // Discussions
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

  // ADRs
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
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  assetResolver: AssetResolver
): Promise<vscode.ChatResult> {

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    stream.markdown("⚠️ No workspace folder is open. Please open a workspace to use the SO assistant.");
    return {};
  }
  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  const slashCommand = request.command;
  const operation    = slashCommand as SkillOperation | undefined;

  // Detect active skill
  const skillFolder = await detectSkill(request.prompt, slashCommand, assetResolver);

  // UI badges
  const badges: string[] = [];
  if (slashCommand) badges.push(`⚡ **/${slashCommand}**`);
  if (skillFolder)  badges.push(`🛠️ skill: \`${skillFolder}\``);
  if (badges.length > 0) stream.markdown(`> ${badges.join(" · ")}\n\n`);

  // Build system prompt (agent context + skill.md + resources)
  const systemPrompt = await buildSystemPrompt(workspaceRoot, skillFolder, assetResolver);

  // Load operation-specific prompt if a slash command was used
  let operationInstruction = "";
  if (operation && skillFolder) {
    operationInstruction = await loadOperationPrompt(
      skillFolder,
      operation,
      assetResolver,
      request.prompt,   // extraParams (contains diagram_id if set)
      request.prompt    // userPrompt (for catalog label matching)
    );
  }

  // Load workspace artifact context
  const artifactMessages = await loadArtifactContext(workspaceRoot, skillFolder);

  // Select model
  const [model] = await vscode.lm.selectChatModels({ vendor: "copilot", family: "gpt-4o" });
  if (!model) {
    stream.markdown("⚠️ No compatible language model available. Please ensure GitHub Copilot is active.");
    return {};
  }

  // Build conversation history
  const history: vscode.LanguageModelChatMessage[] = [];
  for (const turn of chatContext.history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      history.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .filter((r): r is vscode.ChatResponseMarkdownPart => r instanceof vscode.ChatResponseMarkdownPart)
        .map(r => r.value.value)
        .join("");
      if (text) history.push(vscode.LanguageModelChatMessage.Assistant(text));
    }
  }

  // Assemble final messages
  // Operation prompt goes as a separate user message so the model treats it as an instruction
  const userMessage = operationInstruction
    ? `${request.prompt}\n\n---\n\n${operationInstruction}`
    : request.prompt;

  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    ...artifactMessages,
    ...history,
    vscode.LanguageModelChatMessage.User(userMessage),
  ];

  // Stream response
  try {
    const response = await model.sendRequest(messages, {}, token);
    for await (const chunk of response.text) {
      stream.markdown(chunk);
    }
  } catch (err) {
    stream.markdown(`\n\n⚠️ Error communicating with model: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {};
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSoParticipant(
  context: vscode.ExtensionContext,
  assetResolver: AssetResolver
): void {
  const participant = vscode.chat.createChatParticipant(
    "so-workspace.so",
    (request, chatContext, stream, token) =>
      soParticipantHandler(request, chatContext, stream, token, assetResolver)
  );

  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets", "icon.png");
  context.subscriptions.push(participant);
}