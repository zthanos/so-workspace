import * as vscode from "vscode";
import { AssetResolver } from "./asset-resolver";

/**
 * Load SO agent context: prefer workspace docs/so_agent_context.md (deterministic per project),
 * fallback to extension template (baseline).
 */
export async function loadSoAgentContext(
  workspaceRoot: vscode.Uri,
  assetResolver: AssetResolver
): Promise<string> {
  const ctxUri = vscode.Uri.joinPath(workspaceRoot, "docs", "so_agent_context.md");

  try {
    const bytes = await vscode.workspace.fs.readFile(ctxUri);
    return Buffer.from(bytes).toString("utf-8");
  } catch {
    const templateUri = assetResolver.getAgentContextTemplatePath();
    const bytes = await vscode.workspace.fs.readFile(templateUri);
    return Buffer.from(bytes).toString("utf-8");
  }
}
