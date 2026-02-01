import * as vscode from "vscode";

export function workspaceRoot(): vscode.Uri {
  const wf = vscode.workspace.workspaceFolders?.[0];
  if (!wf) throw new Error("No workspace folder is open.");
  return wf.uri;
}

export async function readText(relPath: string): Promise<string> {
  const uri = vscode.Uri.joinPath(workspaceRoot(), relPath);
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder("utf-8").decode(bytes);
}

export async function writeText(relPath: string, content: string): Promise<void> {
  const uri = vscode.Uri.joinPath(workspaceRoot(), relPath);
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
}

export async function exists(relPath: string): Promise<boolean> {
  try {
    const uri = vscode.Uri.joinPath(workspaceRoot(), relPath);
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export function isoStampForFilename(d: Date): string {
  // YYYY-MM-DDTHH-MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
