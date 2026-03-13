import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";

// ---------------------------------------------------------------------------
// Types — mirror the frontmatter schema in skill.md files
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Minimal YAML frontmatter parser (no external dependency)
// Handles: scalars, arrays (inline + block), nested objects, empty maps {}
// ---------------------------------------------------------------------------

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
    if (line.trim() === "" || line.trim().startsWith("#")) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break; // back to parent

    const keyMatch = line.match(/^(\s*)([\w-]+):\s*(.*)/);
    if (!keyMatch) { i++; continue; }

    const key   = keyMatch[2];
    const inline = keyMatch[3].trim();
    i++;

    if (inline === "{}" || inline === "") {
      if (inline === "{}") {
        result[key] = {};
        continue;
      }
      // block value — collect children at indent+2
      const children: string[] = [];
      while (i < lines.length) {
        const childLine = lines[i];
        if (childLine.trim() === "") { i++; continue; }
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
    } else if (inline.startsWith("[") && inline.endsWith("]")) {
      // inline sequence: [a, b, c]
      result[key] = inline
        .slice(1, -1)
        .split(",")
        .map(s => unquote(s.trim()))
        .filter(Boolean);
    } else {
      result[key] = unquote(inline);
    }
  }

  return { value: result, consumed: i };
}

function parseBlockSequence(lines: string[]): unknown[] {
  const items: unknown[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    const seqMatch = line.match(/^(\s*)-\s+(.*)/);
    if (!seqMatch) { i++; continue; }

    const inline = seqMatch[2].trim();
    i++;

    if (inline === "" || inline === "{}") {
      // block map item — collect continuation lines
      const children: string[] = [];
      const baseIndent = (line.search(/\S/)) + 2;
      while (i < lines.length && lines[i].search(/\S/) >= baseIndent) {
        children.push(lines[i]);
        i++;
      }
      items.push(children.length ? parseYamlBlock(children, baseIndent).value : {});
    } else if (inline.includes(": ")) {
      // single-line map item: "- key: value"
      const obj: Record<string, string> = {};
      const pairs = [inline];
      while (i < lines.length && !lines[i].trim().startsWith("- ")) {
        const cont = lines[i].trim();
        if (cont === "" || lines[i].search(/\S/) <= line.search(/\S/)) break;
        pairs.push(cont);
        i++;
      }
      for (const pair of pairs) {
        const m = pair.match(/^([\w-]+):\s*(.*)/);
        if (m) obj[m[1]] = unquote(m[2].trim());
      }
      items.push(obj);
    } else {
      items.push(unquote(inline));
    }
  }
  return items;
}

function unquote(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

// ---------------------------------------------------------------------------
// Loader & cache
// ---------------------------------------------------------------------------

let assetResolver: AssetResolver;

// Cache: skillFolder → { config, watchDisposable }
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

  const uri   = assetResolver.getSkillPath(`${skillFolder}/skill.md`);
  const raw   = await assetResolver.readAsset(uri);
  const fm    = parseFrontmatter(raw) as Record<string, unknown>;

  // Normalise operations: list → object, object stays object
  let operations: Record<string, OperationConfig> = {};
  const rawOps = fm.operations;
  if (Array.isArray(rawOps)) {
    for (const op of rawOps as string[]) operations[op] = {};
  } else if (rawOps && typeof rawOps === "object") {
    operations = rawOps as Record<string, OperationConfig>;
  }

  const config: SkillConfig = {
    id:          fm.id          as string ?? skillFolder,
    name:        fm.name        as string,
    description: fm.description as string,
    participant: fm.participant  as string ?? "so",
    operations,
    inputs:    fm.inputs    as SkillConfig["inputs"],
    quickPick: fm.quickPick as SkillConfig["quickPick"],
  };

  // Watch for file changes in development (invalidate on save)
  let watcher: vscode.Disposable | undefined;
  const pattern = new vscode.RelativePattern(
    vscode.Uri.joinPath(uri, ".."),
    "skill.md"
  );
  const fsWatcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher = fsWatcher.onDidChange(() => {
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
    qp.options.map(o => ({ label: o.label, detail: o.value })),
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
      title:          inputCfg.title,
      prompt:         inputCfg.prompt,
      placeHolder:    inputCfg.placeholder,
      ignoreFocusOut: true,
    });
    if (!value?.trim()) return null; // cancelled or empty

    const ids = value.split(",").map(x => x.trim()).filter(Boolean).join(", ");
    // key → param name: "issueIds" → "IssueIds"
    const paramName = inputKey.charAt(0).toUpperCase() + inputKey.slice(1);
    parts.push(`${paramName}: ${ids}`);
  }

  return parts.length ? parts.join(" ") : undefined;
}