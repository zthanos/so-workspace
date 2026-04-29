import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import {
  loadSkillConfig, SkillConfig, SkillOperation,
  matchDiagramFromPrompt, getDiagramById, resolvePromptKey,
  DiagramCatalogEntry,
} from "./skill-loader";
import { AssetResolver } from "./asset-resolver";
import { WorkspaceInitializer } from "./workspace-initializer";

// ---------------------------------------------------------------------------
// Paths (relative to workspace root)
// ---------------------------------------------------------------------------

const AGENT_CONTEXT_PATHS   = [
  "docs/so_agent_context.md",
  ".github/so_agent_context.md",
] as const;
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
  adrs:        "docs/04_decisions",
  references:  "docs/99_references",
};

const NATIVE_EDIT_START_COMMANDS = [
  "inlineChat.start",
  "interactiveEditor.start",
] as const;
const NATIVE_CHAT_SUBMIT_COMMAND = "workbench.action.chat.submit";

const ARTIFACT_TARGETS: Record<string, Partial<Record<SkillOperation, string>>> = {
  "requirements-inventory": {
    generate: "docs/01_requirements/requirements.inventory.md",
    update: "docs/01_requirements/requirements.inventory.md",
    patch: "docs/01_requirements/requirements.inventory.md",
    eval: "docs/reports/inventory_inconsistencies/latest.md",
    recheck: "docs/reports/inventory_inconsistencies/latest.md",
  },
  bpmn: {
    generate: "docs/03_architecture/diagrams/src/bpmn_process.drawio",
    update: "docs/03_architecture/diagrams/src/bpmn_process.drawio",
    patch: "docs/03_architecture/diagrams/src/bpmn_process.drawio",
    eval: "docs/reports/diagram_inconsistencies/bpmn/latest.md",
    recheck: "docs/reports/diagram_inconsistencies/bpmn/latest.md",
  },
  objectives: {
    generate: "docs/02_objectives/objectives.md",
    update: "docs/02_objectives/objectives.md",
    patch: "docs/02_objectives/objectives.md",
    eval: "docs/reports/objectives_inconsistencies/latest.md",
    recheck: "docs/reports/objectives_inconsistencies/latest.md",
  },
  "solution-outline": {
    generate: "docs/03_architecture/solution_outline.md",
    update: "docs/03_architecture/solution_outline.md",
    patch: "docs/03_architecture/solution_outline.md",
    eval: "docs/reports/solution_outline_inconsistencies/latest.md",
    recheck: "docs/reports/solution_outline_inconsistencies/latest.md",
  },
  adr: {
    generate: "docs/04_decisions/ADR-001.md",
    update: "docs/04_decisions/ADR-001.md",
    patch: "docs/04_decisions/ADR-001.md",
    eval: "docs/reports/adr_inconsistencies/latest.md",
    recheck: "docs/reports/adr_inconsistencies/latest.md",
  },
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
  "bpmn",
  "solution-outline",
  "adr",
] as const;

const SKILL_ALIASES: Record<string, string[]> = {
  "requirements-inventory": [
    "requirements inventory",
    "requirements",
    "inventory",
    "from brd",
    "requirements from brd",
    "brd",
    "business requirements",
  ],
  objectives: [
    "objectives",
    "objective",
  ],
  diagrams: [
    "diagram",
    "diagrams",
    "c4",
    "drawio",
    "draw.io",
    "context diagram",
    "container diagram",
    "flow diagram",
    "sequence diagram",
    "state diagram",
  ],
  bpmn: [
    "bpmn",
    "bpmn 2.0",
    "business process diagram",
    "process model",
    "workflow with lanes",
    "workflow with pools",
    "collaboration diagram",
  ],
  "solution-outline": [
    "solution outline",
    "architecture outline",
    "solution document",
  ],
  adr: [
    "adr",
    "adrs",
    "decision record",
    "architecture decision record",
  ],
};

type ParticipantCommandResolution =
  | { type: "workspace-update" }
  | {
      type: "skill";
      skillFolder: string;
      operation?: SkillOperation;
      promptAugment?: string;
    };

const PARTICIPANT_COMMAND_ALIASES: Record<string, ParticipantCommandResolution> = {
  updateWorkspace: { type: "workspace-update" },
  UpdateWorkspace: { type: "workspace-update" },

  generateRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "generate" },
  GenerateRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "generate" },
  generateRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "generate" },
  GenerateRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "generate" },
  evaluateRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "eval" },
  EvaluateRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "eval" },
  evaluateRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "eval" },
  EvaluateRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "eval" },
  patchRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "patch" },
  PatchRequirements: { type: "skill", skillFolder: "requirements-inventory", operation: "patch" },
  patchRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "patch" },
  PatchRequirement: { type: "skill", skillFolder: "requirements-inventory", operation: "patch" },
  reviewRequirements: { type: "skill", skillFolder: "requirements-inventory" },
  ReviewRequirements: { type: "skill", skillFolder: "requirements-inventory" },
  reviewRequirement: { type: "skill", skillFolder: "requirements-inventory" },
  ReviewRequirement: { type: "skill", skillFolder: "requirements-inventory" },

  generateObjectives: { type: "skill", skillFolder: "objectives", operation: "generate" },
  GenerateObjectives: { type: "skill", skillFolder: "objectives", operation: "generate" },
  generateObjective: { type: "skill", skillFolder: "objectives", operation: "generate" },
  GenerateObjective: { type: "skill", skillFolder: "objectives", operation: "generate" },
  evaluateObjectives: { type: "skill", skillFolder: "objectives", operation: "eval" },
  EvaluateObjectives: { type: "skill", skillFolder: "objectives", operation: "eval" },
  evaluateObjective: { type: "skill", skillFolder: "objectives", operation: "eval" },
  EvaluateObjective: { type: "skill", skillFolder: "objectives", operation: "eval" },
  patchObjectives: { type: "skill", skillFolder: "objectives", operation: "patch" },
  PatchObjectives: { type: "skill", skillFolder: "objectives", operation: "patch" },
  patchObjective: { type: "skill", skillFolder: "objectives", operation: "patch" },
  PatchObjective: { type: "skill", skillFolder: "objectives", operation: "patch" },
  reviewObjectives: { type: "skill", skillFolder: "objectives" },
  ReviewObjectives: { type: "skill", skillFolder: "objectives" },
  reviewObjective: { type: "skill", skillFolder: "objectives" },
  ReviewObjective: { type: "skill", skillFolder: "objectives" },

  generateC4: { type: "skill", skillFolder: "diagrams", operation: "generate", promptAugment: "diagram_id: c4_context" },
  GenerateC4: { type: "skill", skillFolder: "diagrams", operation: "generate", promptAugment: "diagram_id: c4_context" },
  evaluateC4: { type: "skill", skillFolder: "diagrams", operation: "eval", promptAugment: "diagram_id: c4_context" },
  EvaluateC4: { type: "skill", skillFolder: "diagrams", operation: "eval", promptAugment: "diagram_id: c4_context" },
  patchC4: { type: "skill", skillFolder: "diagrams", operation: "patch", promptAugment: "diagram_id: c4_context" },
  PatchC4: { type: "skill", skillFolder: "diagrams", operation: "patch", promptAugment: "diagram_id: c4_context" },
  reviewC4: { type: "skill", skillFolder: "diagrams", promptAugment: "diagram_id: c4_context" },
  ReviewC4: { type: "skill", skillFolder: "diagrams", promptAugment: "diagram_id: c4_context" },

  generateSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "generate" },
  GenerateSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "generate" },
  evaluateSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "eval" },
  EvaluateSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "eval" },
  patchSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "patch" },
  PatchSolutionOutline: { type: "skill", skillFolder: "solution-outline", operation: "patch" },
  reviewSolutionOutline: { type: "skill", skillFolder: "solution-outline" },
  ReviewSolutionOutline: { type: "skill", skillFolder: "solution-outline" },
};

// Maps slash operation name → prompt file name (without .prompt.md)
const OPERATION_TO_PROMPT: Record<string, string> = {
  generate: "generate",
  eval:     "evaluate",
  update:   "update",
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

async function readDirContextFilesRecursive(
  dirPath: string,
  baseDir: string = dirPath
): Promise<{ file: string; relativePath: string; content: string }[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results: { file: string; relativePath: string; content: string }[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...await readDirContextFilesRecursive(fullPath, baseDir));
        continue;
      }

      if (!entry.isFile()) continue;

      const lowerName = entry.name.toLowerCase();
      const supported =
        lowerName.endsWith(".md") ||
        lowerName.endsWith(".yaml") ||
        lowerName.endsWith(".yml") ||
        lowerName.endsWith(".json") ||
        lowerName.endsWith(".txt");

      if (!supported) continue;

      const content = await readFileSafe(fullPath);
      if (!content) continue;

      results.push({
        file: entry.name,
        relativePath: path.relative(baseDir, fullPath).replace(/\\/g, "/"),
        content,
      });
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
  if (command && ["generate", "eval", "update", "patch", "recheck"].includes(command)) {
    return "requirements-inventory";
  }

  return null;
}

async function detectSkillDeterministic(
  prompt: string,
  command: string | undefined,
  assetResolver: AssetResolver
): Promise<string | null> {
  const lower = prompt.toLowerCase();

  if (lower.includes("diagram_id:")) {
    return "diagrams";
  }

  for (const [skillFolder, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return skillFolder;
    }
  }

  if (command && ["generate", "eval", "update", "patch", "recheck"].includes(command)) {
    return "requirements-inventory";
  }

  return detectSkill(prompt, command, assetResolver);
}

function inferOperationFromPrompt(prompt: string): SkillOperation | undefined {
  const lower = prompt.toLowerCase();

  if (/\b(recheck|re-check|check again|verify again|revalidate)\b/.test(lower)) {
    return "recheck";
  }

  if (/\b(patch|fix|apply fixes|correct issues|resolve issues)\b/.test(lower)) {
    return "patch";
  }

  if (/\b(evaluate|eval|review|assess|check)\b/.test(lower)) {
    return "eval";
  }

  if (/\b(update|change|modify|edit|revise|refine)\b/.test(lower)) {
    return "update";
  }

  if (/\b(generate|create|draft|produce|build|write)\b/.test(lower)) {
    return "generate";
  }

  return undefined;
}

function resolveParticipantCommand(command: string | undefined, prompt: string): ParticipantCommandResolution | undefined {
  if (!command) return undefined;

  const mapped = PARTICIPANT_COMMAND_ALIASES[command];
  if (!mapped) return undefined;

  if (
    mapped.type === "skill" &&
    mapped.skillFolder === "diagrams" &&
    mapped.promptAugment === "diagram_id: c4_context"
  ) {
    const lower = prompt.toLowerCase();
    if (lower.includes("container")) {
      return { ...mapped, promptAugment: "diagram_id: c4_container" };
    }
  }

  return mapped;
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
  let agentContext: string | null = null;
  for (const relPath of AGENT_CONTEXT_PATHS) {
    agentContext = await readFileSafe(path.join(workspaceRoot, relPath));
    if (agentContext) break;
  }
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
      if (!wsSkillContent) {
        throw new Error(`Missing workspace skill content for ${skillFolder}.`);
      }
      parts.push(`# Active Skill: ${config.name} (workspace)\n\n` + wsSkillContent);

      // Resources: workspace-owned only. No packaged fallback.
      const resourceFiles = ["methodology.md", "output-template.md", "report-template.md", "taxonomy.md", "mapping-rules.md", "review-rules.md", "section-guidelines.md", "registry-guidelines.md", "diagram-taxonomy.md", "drawio-c4-guidelines.md", "drawio-c4-layout-patterns.md", "drawio-c4-anti-patterns.md", "drawio-xml-integrity.md", "drawio-c4-examples.md", "drawio-bpmn-guidelines.md", "drawio-bpmn-layout-patterns.md", "drawio-bpmn-anti-patterns.md", "drawio-bpmn-examples.md", "adr-template.md", "decision-guidelines.md", "evaluation-rules.md"];
      for (const resFile of resourceFiles) {
        const wsResContent = await readFileSafe(
          path.join(workspaceRoot, WORKSPACE_SKILLS_PATH, skillFolder, "resources", resFile)
        );
        if (wsResContent) {
          const label = path.basename(resFile, ".md");
          parts.push(`## Skill Resource: ${label} (workspace)\n\n` + wsResContent);
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
  workspaceRoot: string,
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

  // Workspace-owned prompt files only. No packaged fallback.
  for (const candidate of candidates) {
    const workspacePromptPath = path.join(
      workspaceRoot,
      WORKSPACE_SKILLS_PATH,
      skillFolder,
      "resources",
      "prompts",
      `${candidate}.prompt.md`
    );
    const content = await readFileSafe(workspacePromptPath);
    if (content) {
      return content;
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
    case "update":   return "Execute the update operation. Update the primary artifact directly from the current workspace context without relying on an inconsistency report.";
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
        `<artifact label="ADR: ${file}" path="docs/04_decisions/${file}">\n${content}\n</artifact>`
      )
    );
    loadedFiles.push(`docs/04_decisions/${file}`);
  }

  // Local reference snapshot
  const references = await readDirContextFilesRecursive(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.references)
  );
  for (const { file, relativePath, content } of references) {
    const workspacePath = `docs/99_references/${relativePath}`;
    messages.push(
      vscode.LanguageModelChatMessage.User(
        `<artifact label="Reference: ${file}" path="${workspacePath}">\n${content}\n</artifact>`
      )
    );
    loadedFiles.push(workspacePath);
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

async function collectArtifactPaths(
  workspaceRoot: string,
  skillFolder: string | null
): Promise<string[]> {
  const paths: string[] = [];

  async function addPathIfExists(relPath: string) {
    const content = await readFileSafe(path.join(workspaceRoot, relPath));
    if (content) {
      paths.push(relPath);
    }
  }

  await addPathIfExists(AUTHORITATIVE_ARTIFACTS.objectives);
  await addPathIfExists(AUTHORITATIVE_ARTIFACTS.requirements);
  await addPathIfExists(AUTHORITATIVE_ARTIFACTS.solutionOutline);

  if (skillFolder === "requirements-inventory") {
    await addPathIfExists(CONTEXT_ARTIFACTS.brd);
  }

  const discussions = await readDirMarkdownFiles(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.discussions)
  );
  for (const { file } of discussions) {
    if (file.toLowerCase() === "readme.md") continue;
    paths.push(`docs/98_discussions/${file}`);
  }

  const adrs = await readDirMarkdownFiles(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.adrs)
  );
  for (const { file } of adrs) {
    paths.push(`docs/04_decisions/${file}`);
  }

  const references = await readDirContextFilesRecursive(
    path.join(workspaceRoot, CONTEXT_ARTIFACTS.references)
  );
  for (const { relativePath } of references) {
    const lowerPath = relativePath.toLowerCase();
    if (lowerPath === "readme.md") continue;
    paths.push(`docs/99_references/${relativePath}`);
  }

  return paths;
}

function workspaceRelativePathForFile(filePath: string): string | null {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const folder = folders.find((item) => filePath.startsWith(item.uri.fsPath));
  if (!folder) {
    return null;
  }
  return path.relative(folder.uri.fsPath, filePath).replace(/\\/g, "/");
}

async function resolveArtifactTarget(
  skillFolder: string | null,
  operation: SkillOperation | undefined,
  prompt: string
): Promise<string | null> {
  if (!skillFolder || !operation) {
    return null;
  }

  if (skillFolder === "diagrams") {
    const config = await loadSkillConfig("diagrams");
    const diagramIdMatch = prompt.match(/diagram_id:\s*(\S+)/i);
    const diagramEntry = diagramIdMatch
      ? getDiagramById(config, diagramIdMatch[1])
      : matchDiagramFromPrompt(config, prompt);

    if (diagramEntry) {
      if (operation === "eval" || operation === "recheck") {
        return `docs/reports/diagram_inconsistencies/${diagramEntry.id}/latest.md`;
      }
      return diagramEntry.outputPath;
    }
  }

  if (skillFolder === "adr") {
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (activeFile && /docs[\\/](04_decisions|04_adrs)[\\/].*\.md$/i.test(activeFile)) {
      return workspaceRelativePathForFile(activeFile);
    }
  }

  return ARTIFACT_TARGETS[skillFolder]?.[operation] ?? null;
}

function buildNativeEditPrompt(
  systemPrompt: string,
  operationInstruction: string,
  artifactTarget: string,
  contextPaths: string[],
  userPrompt: string,
  skillFolder?: string | null,
  operation?: SkillOperation
): string {
  const compactContextPaths = contextPaths.slice(0, 8);
  const sections = [
    `Edit the currently open file: ${artifactTarget}`,
    `Use only workspace artifacts as source of truth. Do not invent scope or unsupported details.`,
    `Target file: ${artifactTarget}`,
    compactContextPaths.length
      ? `Relevant workspace files:\n${compactContextPaths.map((item) => `- ${item}`).join("\n")}`
      : "Relevant workspace files: none pre-identified",
    contextPaths.length > compactContextPaths.length
      ? `Additional workspace files are available if needed: ${contextPaths.length - compactContextPaths.length}`
      : "",
    buildNativeEditInstruction(skillFolder, operation, artifactTarget, operationInstruction),
    `User request:\n${userPrompt}`,
    `Apply the change directly in ${artifactTarget}. Prefer native inline edits over chat-only suggestions.`,
  ].filter(Boolean);

  return sections.join("\n\n---\n\n");
}

function buildNativeEditInstruction(
  skillFolder: string | null | undefined,
  operation: SkillOperation | undefined,
  artifactTarget: string,
  operationInstruction: string
): string {
  const action = operation ?? "update";

  const deterministicGuidance: Record<string, string[]> = {
    "requirements-inventory": [
      `SO ${action} guidance for Requirements Inventory:`,
      "- work only from the BRD and relevant workspace context",
      "- keep content business-oriented and implementation-neutral",
      "- classify requirements cleanly and avoid duplicates",
      "- update only the target requirements artifact",
    ],
    "objectives": [
      `SO ${action} guidance for Objectives:`,
      "- derive objectives from the validated requirements inventory",
      "- do not introduce unsupported systems, scope, or architecture decisions",
      "- keep terminology aligned with the requirements artifact",
      "- update only the target objectives artifact",
    ],
    "solution-outline": [
      `SO ${action} guidance for Solution Outline:`,
      "- derive content only from validated objectives and architecture artifacts",
      "- keep the document architectural, not implementation-level",
      "- do not add unsupported sections, systems, or technologies",
      "- update only the target solution outline artifact",
    ],
    "adr": [
      `SO ${action} guidance for ADR:`,
      "- capture decisions, rationale, alternatives, and consequences clearly",
      "- stay aligned with workspace artifacts and approved constraints",
      "- do not silently reconcile conflicts; surface them when needed",
      "- update only the target ADR artifact",
    ],
    "diagrams": [
      `SO ${action} guidance for Diagram:`,
      artifactTarget.endsWith(".drawio")
        ? "- for C4 diagrams, preserve valid editable draw.io XML and enterprise-grade layout"
        : "- preserve valid diagram source syntax",
      "- keep the abstraction level correct",
      "- do not invent unsupported actors, systems, containers, or relationships",
      "- update only the target diagram artifact",
    ],
    "bpmn": [
      `SO ${action} guidance for BPMN Diagram:`,
      "- preserve valid editable draw.io XML using BPMN 2.0 semantics",
      "- use correct BPMN shapes, pools, lanes, and connector types",
      "- do not invent unsupported participants, tasks, gateways, or messages",
      "- update only the target BPMN artifact",
    ],
  };

  const selected = skillFolder ? deterministicGuidance[skillFolder] : undefined;
  if (selected?.length) {
    return selected.join("\n");
  }

  if (!operationInstruction.trim()) {
    return "";
  }

  const lines = operationInstruction
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return `SO operation guidance:\n${lines.slice(0, 8).join("\n")}`;
}

async function ensureTargetDocument(
  workspaceRoot: string,
  relativePath: string,
  skillFolder?: string | null
): Promise<vscode.Uri> {
  const targetUri = vscode.Uri.file(path.join(workspaceRoot, relativePath));
  const parentUri = vscode.Uri.file(path.dirname(targetUri.fsPath));
  await vscode.workspace.fs.createDirectory(parentUri);
  try {
    await vscode.workspace.fs.stat(targetUri);
  } catch {
    const initialContent = await getInitialTargetContent(workspaceRoot, relativePath, skillFolder);
    await vscode.workspace.fs.writeFile(
      targetUri,
      new TextEncoder().encode(initialContent)
    );
  }
  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc, { preview: false });
  return targetUri;
}

async function getInitialTargetContent(
  workspaceRoot: string,
  relativePath: string,
  skillFolder?: string | null
): Promise<string> {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  if (!normalizedPath.endsWith(".drawio")) {
    return "";
  }

  const templatePath = path.join(
    workspaceRoot,
    WORKSPACE_SKILLS_PATH,
    skillFolder ?? "diagrams",
    "resources",
    "templates",
    path.basename(normalizedPath)
  );

  const workspaceTemplate = await readFileSafe(templatePath);
  if (workspaceTemplate) {
    return workspaceTemplate;
  }

  return buildDefaultDrawioTemplate(path.basename(normalizedPath, ".drawio"));
}

function buildDefaultDrawioTemplate(diagramId: string): string {
  const prettyName = diagramId
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="SO Workspace" version="24.7.17">
  <diagram id="${diagramId}" name="${prettyName}">
    <mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

async function handoffToNativeEditSession(prompt: string): Promise<{
  started: boolean;
  autoSubmitted: boolean;
  command?: string;
}> {
  const commands = new Set(await vscode.commands.getCommands(true));
  const startCommand = NATIVE_EDIT_START_COMMANDS.find((command) => commands.has(command));
  if (!startCommand) {
    return { started: false, autoSubmitted: false };
  }

  await vscode.commands.executeCommand(startCommand);
  await new Promise((resolve) => setTimeout(resolve, 150));
  await vscode.commands.executeCommand("type", { text: prompt });

  let autoSubmitted = false;
  if (commands.has(NATIVE_CHAT_SUBMIT_COMMAND)) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 75));
      await vscode.commands.executeCommand(NATIVE_CHAT_SUBMIT_COMMAND);
      autoSubmitted = true;
    } catch {
      autoSubmitted = false;
    }
  }

  return { started: true, autoSubmitted, command: startCommand };
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
  const commandResolution = resolveParticipantCommand(slashCommand, request.prompt);
  const effectivePrompt =
    commandResolution?.type === "skill" && commandResolution.promptAugment
      ? `${commandResolution.promptAugment} ${request.prompt}`.trim()
      : request.prompt;
  const operation = commandResolution?.type === "skill"
    ? commandResolution.operation
    : (slashCommand as SkillOperation | undefined) ?? inferOperationFromPrompt(request.prompt);

  if (commandResolution?.type === "workspace-update") {
    const response = await vscode.window.showWarningMessage(
      "Update workspace templates from the current extension version? This will overwrite .github/skills, .github/rules, docs/so_agent_context.md, and README_SO_Workspace.md.",
      { modal: true },
      "Update",
      "Cancel"
    );

    if (response !== "Update") {
      stream.markdown("Workspace template update cancelled.");
      return {};
    }

    try {
      const initializer = new WorkspaceInitializer(assetResolver);
      await initializer.updateWorkspaceTemplates(workspaceFolders[0].uri);
      stream.markdown(
        "Workspace templates updated from the current extension version.\n\nUpdated targets:\n- `.github/skills/**`\n- `.github/rules/**`\n- `docs/so_agent_context.md`\n- `README_SO_Workspace.md`"
      );
    } catch (error) {
      stream.markdown(
        `Failed to update workspace templates: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return {};
  }

  // Detect active skill
  const skillFolder = commandResolution?.type === "skill"
    ? commandResolution.skillFolder
    : await detectSkillDeterministic(effectivePrompt, slashCommand, assetResolver);

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
      workspaceRoot,
      skillFolder,
      operation,
      assetResolver,
      effectivePrompt,   // extraParams (contains diagram_id if set)
      effectivePrompt    // userPrompt (for catalog label matching)
    );
  }

  const artifactTarget = await resolveArtifactTarget(skillFolder, operation, effectivePrompt);

  if (artifactTarget && skillFolder && operation) {
    const contextPaths = await collectArtifactPaths(workspaceRoot, skillFolder);
    const nativePrompt = buildNativeEditPrompt(
      systemPrompt,
      operationInstruction,
      artifactTarget,
      contextPaths,
      effectivePrompt,
      skillFolder,
      operation
    );

    const targetUri = await ensureTargetDocument(workspaceRoot, artifactTarget, skillFolder);
    const handoff = await handoffToNativeEditSession(nativePrompt);

    if (handoff.started) {
      stream.markdown(
        handoff.autoSubmitted
          ? `Opened native editor chat for \`${artifactTarget}\` and handed off the SO prompt.`
          : `Opened native editor chat for \`${artifactTarget}\` and prefilled the SO prompt. Press Enter in the editor chat to run it.`
      );
      stream.reference(targetUri);
      return {
        metadata: {
          mode: "native-edit-handoff",
          artifactTarget,
          skillFolder,
          operation,
          autoSubmitted: handoff.autoSubmitted,
          command: handoff.command,
        },
      };
    }

    stream.markdown(
      `Native editor chat is not available in this VS Code environment. Falling back to normal chat output for \`${artifactTarget}\`.`
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
    ? `${effectivePrompt}\n\n---\n\n${operationInstruction}`
    : effectivePrompt;

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
