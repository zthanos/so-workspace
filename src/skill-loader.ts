import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";

export type SkillOperation = "generate" | "eval" | "patch" | "recheck" | string;

export interface QuickPickOption {
  value: string;
  label: string;
}

export interface OperationConfig {
  requiresIssueIds?: boolean;
}

export interface InputConfig {
  forOperations: SkillOperation[];
  type: "text";
  title: string;
  prompt: string;
  placeholder: string;
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  participant: string;
  operations: Record<SkillOperation, OperationConfig>;
  inputs?: Record<string, InputConfig>;
  quickPick?: {
    paramName: string;
    title: string;
    forOperations: SkillOperation[];
    options: QuickPickOption[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback?: string): string {
  return typeof value === "string" ? value : (fallback ?? "");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return parseYamlBlock(match[1].split(/\r?\n/), 0).value as Record<string, unknown>;
}

function parseYamlBlock(
  lines: string[],
  baseIndent: number
): { value: unknown; consumed: number } {
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;

    const keyMatch = line.match(/^(\s*)([\w-]+):\s*(.*)/);
    if (!keyMatch) {
      throw new Error(`Unsupported frontmatter line: "${line}"`);
    }

    const key = keyMatch[2];
    const inline = keyMatch[3].trim();
    i++;

    if (inline === "{}") {
      result[key] = {};
      continue;
    }

    if (inline === "") {
      const children: string[] = [];
      while (i < lines.length) {
        const childLine = lines[i];
        if (childLine.trim() === "") {
          i++;
          continue;
        }
        const childIndent = childLine.search(/\S/);
        if (childIndent <= indent) break;
        children.push(childLine);
        i++;
      }

      if (children.length === 0) {
        result[key] = undefined;
      } else if (children[0].trim().startsWith("- ")) {
        result[key] = parseBlockSequence(children);
      } else {
        result[key] = parseYamlBlock(children, children[0].search(/\S/)).value;
      }
      continue;
    }

    if (inline.startsWith("[") && inline.endsWith("]")) {
      result[key] = inline
        .slice(1, -1)
        .split(",")
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
      continue;
    }

    result[key] = unquote(inline);
  }

  return { value: result, consumed: i };
}

function parseBlockSequence(lines: string[]): unknown[] {
  const items: unknown[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const seqMatch = line.match(/^(\s*)-\s+(.*)/);
    if (!seqMatch) {
      throw new Error(`Unsupported sequence line: "${line}"`);
    }

    const inline = seqMatch[2].trim();
    const seqIndent = line.search(/\S/);
    i++;

    if (inline === "" || inline === "{}") {
      const children: string[] = [];
      const baseIndent = seqIndent + 2;

      while (i < lines.length) {
        const childLine = lines[i];
        if (childLine.trim() === "") {
          i++;
          continue;
        }
        const childIndent = childLine.search(/\S/);
        if (childIndent < baseIndent) break;
        children.push(childLine);
        i++;
      }

      items.push(children.length ? parseYamlBlock(children, baseIndent).value : {});
      continue;
    }

    if (inline.includes(": ")) {
      const obj: Record<string, unknown> = {};
      const pairs = [inline];

      while (i < lines.length) {
        const next = lines[i];
        if (next.trim().startsWith("- ")) break;
        if (next.trim() === "") {
          i++;
          continue;
        }
        const nextIndent = next.search(/\S/);
        if (nextIndent <= seqIndent) break;
        pairs.push(next.trim());
        i++;
      }

      for (const pair of pairs) {
        const m = pair.match(/^([\w-]+):\s*(.*)/);
        if (m) obj[m[1]] = unquote(m[2].trim());
      }

      items.push(obj);
      continue;
    }

    items.push(unquote(inline));
  }

  return items;
}

function unquote(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

function normalizeSkillConfig(fm: Record<string, unknown>, skillFolder: string): SkillConfig {
  let operations: Record<SkillOperation, OperationConfig> = {};
  const rawOps = fm.operations;

  if (Array.isArray(rawOps)) {
    for (const op of rawOps) {
      if (typeof op === "string") operations[op] = {};
    }
  } else if (isRecord(rawOps)) {
    operations = rawOps as Record<SkillOperation, OperationConfig>;
  }

  const quickPickRaw = isRecord(fm.quickPick) ? fm.quickPick : undefined;
  const inputsRaw = isRecord(fm.inputs) ? fm.inputs : undefined;

  return {
    id: asString(fm.id, skillFolder),
    name: asString(fm.name, skillFolder),
    description: asString(fm.description, ""),
    participant: asString(fm.participant, "so"),
    operations,
    inputs: inputsRaw as SkillConfig["inputs"] | undefined,
    quickPick: quickPickRaw as SkillConfig["quickPick"] | undefined,
  };
}

function validateSkillConfig(config: SkillConfig, skillFolder: string): void {
  if (!config.id) {
    throw new Error(`Skill "${skillFolder}" is missing "id" in frontmatter.`);
  }

  if (!config.name) {
    throw new Error(`Skill "${skillFolder}" is missing "name" in frontmatter.`);
  }

  if (!Object.keys(config.operations).length) {
    throw new Error(`Skill "${skillFolder}" must define at least one operation.`);
  }

  if (config.quickPick) {
    if (!config.quickPick.paramName) {
      throw new Error(`Skill "${skillFolder}" quickPick is missing "paramName".`);
    }
    if (!config.quickPick.title) {
      throw new Error(`Skill "${skillFolder}" quickPick is missing "title".`);
    }
    if (!Array.isArray(config.quickPick.forOperations)) {
      throw new Error(`Skill "${skillFolder}" quickPick.forOperations must be an array.`);
    }
    if (!Array.isArray(config.quickPick.options) || config.quickPick.options.length === 0) {
      throw new Error(`Skill "${skillFolder}" quickPick.options must contain at least one option.`);
    }
  }

  if (config.inputs) {
    for (const [inputKey, inputCfg] of Object.entries(config.inputs)) {
      if (!inputCfg.forOperations?.length) {
        throw new Error(`Skill "${skillFolder}" input "${inputKey}" is missing forOperations.`);
      }
      if (inputCfg.type !== "text") {
        throw new Error(`Skill "${skillFolder}" input "${inputKey}" has unsupported type "${inputCfg.type}".`);
      }
    }
  }
}

let assetResolver: AssetResolver;
const cache = new Map<string, { config: SkillConfig; watcher?: vscode.Disposable }>();

export function initializeSkillLoader(resolver: AssetResolver): void {
  assetResolver = resolver;
  invalidateCache();
}

export function invalidateCache(): void {
  for (const entry of cache.values()) entry.watcher?.dispose();
  cache.clear();
}

export async function loadSkillConfig(skillFolder: string): Promise<SkillConfig> {
  if (cache.has(skillFolder)) return cache.get(skillFolder)!.config;

  const uri = assetResolver.getSkillPath(`${skillFolder}/skill.md`);
  const raw = await assetResolver.readAsset(uri);
  const fm = parseFrontmatter(raw);

  const config = normalizeSkillConfig(fm, skillFolder);
  validateSkillConfig(config, skillFolder);

  const skillDir = vscode.Uri.joinPath(uri, "..");
  const fsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(skillDir, "skill.md")
  );

  const watcher = fsWatcher.onDidChange(() => {
    cache.delete(skillFolder);
    fsWatcher.dispose();
  });

  cache.set(skillFolder, { config, watcher });
  return config;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Shows QuickPick if this operation requires it.
 * Returns the param string (e.g. "diagram_id: c4_context"),
 * undefined if not needed, or null if the user cancelled.
 */
export async function resolveQuickPick(
  config: SkillConfig,
  operation: SkillOperation
): Promise<string | undefined | null> {
  const qp = config.quickPick;
  if (!qp || !qp.forOperations.includes(operation)) return undefined;

  const picked = await vscode.window.showQuickPick(
    qp.options.map((o) => ({ label: o.label, detail: o.value })),
    { title: qp.title, ignoreFocusOut: true }
  );
  if (!picked) return null; // cancelled

  return `${qp.paramName}: ${picked.detail}`;
}

/**
 * Shows input boxes for any inputs whose forOperations includes the current operation.
 * Returns a params string (e.g. "IssueIds: CONS-02"),
 * undefined if no inputs apply, or null if the user cancelled.
 */
export async function resolveInputs(
  config: SkillConfig,
  operation: SkillOperation
): Promise<string | undefined | null> {
  if (!config.inputs) return undefined;

  const parts: string[] = [];

  for (const [inputKey, inputCfg] of Object.entries(config.inputs)) {
    if (!inputCfg.forOperations.includes(operation)) continue;

    const value = await vscode.window.showInputBox({
      title: inputCfg.title,
      prompt: inputCfg.prompt,
      placeHolder: inputCfg.placeholder,
      ignoreFocusOut: true,
    });
    if (!value?.trim()) return null; // cancelled or empty

    const ids = value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(", ");
    const paramName = inputKey.charAt(0).toUpperCase() + inputKey.slice(1);
    parts.push(`${paramName}: ${ids}`);
  }

  return parts.length ? parts.join(" ") : undefined;
}