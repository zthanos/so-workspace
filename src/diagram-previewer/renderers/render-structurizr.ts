import * as vscode from "vscode";
import * as path from "path";
import * as pako from "pako";
import { DiagramDefinition } from "./diagram-types";
import { readConfig } from "../diagram-previewer/config";

/**
 * Renders a Structurizr DSL diagram to SVG + PNG files.
 *
 * Primary: Kroki API (same endpoint as KrokiRenderer preview).
 * Fallback: bundled mermaid.js via hidden webview (if Kroki unavailable).
 *
 * SVG → PNG conversion uses a hidden webview canvas (no sharp, no mermaid-cli).
 */
export async function renderStructurizrDiagram(
  def: DiagramDefinition,
  workspaceRoot: vscode.Uri,
  context: vscode.ExtensionContext
): Promise<void> {
  const sourceUri   = vscode.Uri.joinPath(workspaceRoot, def.sourcePath);
  const sourceBytes = await vscode.workspace.fs.readFile(sourceUri);
  const source      = Buffer.from(sourceBytes).toString("utf8");

  // Fetch SVG from Kroki, fallback to mermaid.js if Kroki is unavailable
  let svg: string;
  try {
    svg = await fetchKrokiSvg(source);
  } catch (krokiErr) {
    console.warn(`[renderStructurizr] Kroki unavailable (${krokiErr}), falling back to mermaid.js`);
    svg = await renderViaMermaidWebview(source, context);
  }

  // Write SVG
  const svgUri = vscode.Uri.joinPath(workspaceRoot, def.outputSvgPath);
  await ensureParentDir(svgUri);
  await vscode.workspace.fs.writeFile(svgUri, Buffer.from(svg, "utf8"));

  // SVG → PNG via hidden webview canvas
  const png = await convertSvgToPngViaWebview(svg, context);
  const pngUri = vscode.Uri.joinPath(workspaceRoot, def.outputPngPath);
  await vscode.workspace.fs.writeFile(pngUri, Buffer.from(png));
}

// ---------------------------------------------------------------------------
// Mermaid.js fallback (used when Kroki is unavailable)
// Uses bundled dist/mermaid/mermaid.esm.min.mjs — no CDN, no mermaid-cli
// ---------------------------------------------------------------------------

function renderViaMermaidWebview(
  source: string,
  context: vscode.ExtensionContext
): Promise<string> {
  return new Promise((resolve, reject) => {
    const mermaidDiskPath = vscode.Uri.file(
      path.join(context.extensionPath, "dist", "mermaid", "mermaid.esm.min.mjs")
    );

    const panel = vscode.window.createWebviewPanel(
      "structurizrMermaidFallback",
      "Structurizr Fallback Render",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "dist"))],
      }
    );

    const mermaidUri = panel.webview.asWebviewUri(mermaidDiskPath);
    const escapedSource = source.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

    panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<script type="module">
  import mermaid from '${mermaidUri}';
  const vscode = acquireVsCodeApi();
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  async function run() {
    try {
      const { svg } = await mermaid.render('fallback-export', \\`${escapedSource}\\`);
      vscode.postMessage({ type: 'svg', svg });
    } catch (err) {
      vscode.postMessage({ type: 'error', error: String(err) });
    }
  }
  run();
</script></body></html>`;

    const timeout = setTimeout(() => {
      panel.dispose();
      reject(new Error("Mermaid fallback render timed out"));
    }, 30_000);

    panel.webview.onDidReceiveMessage((msg) => {
      clearTimeout(timeout);
      panel.dispose();
      if (msg.type === "svg") resolve(msg.svg as string);
      else reject(new Error(`Mermaid fallback error: ${msg.error}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Kroki fetch (mirrors KrokiRenderer.makeRequest + encodeContent)
// ---------------------------------------------------------------------------

async function fetchKrokiSvg(source: string): Promise<string> {
  const config   = readConfig();
  const endpoint = config.krokiEndpoint.replace(/\/$/, "");

  // Encode: zlib deflate → base64url (same as KrokiRenderer)
  const compressed = pako.deflate(source, { level: 9 });
  const base64url  = Buffer.from(compressed)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const url = `${endpoint}/structurizr/svg/${base64url}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Kroki request timed out (10s)")), 10_000)
  );

  const response = await Promise.race([fetch(url), timeoutPromise]);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kroki HTTP ${response.status}: ${body || response.statusText}`);
  }

  return response.text();
}

// ---------------------------------------------------------------------------
// SVG → PNG via hidden webview canvas (no sharp, no mermaid-cli)
// ---------------------------------------------------------------------------

function convertSvgToPngViaWebview(
  svg: string,
  context: vscode.ExtensionContext
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const panel = vscode.window.createWebviewPanel(
      "structurizrExport",
      "Structurizr Export",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true }
    );

    const escapedSvg = svg
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`");

    panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body>
<canvas id="canvas"></canvas>
<script>
  const vscode = acquireVsCodeApi();
  const svgStr = \`${escapedSvg}\`;
  const blob   = new Blob([svgStr], { type: 'image/svg+xml' });
  const url    = URL.createObjectURL(blob);
  const img    = new Image();

  img.onload = () => {
    const canvas  = document.getElementById('canvas');
    canvas.width  = img.naturalWidth  || 1200;
    canvas.height = img.naturalHeight || 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    vscode.postMessage({ type: 'png', data: canvas.toDataURL('image/png') });
  };

  img.onerror = (e) => vscode.postMessage({ type: 'error', error: String(e) });
  img.src = url;
</script>
</body></html>`;

    const timeout = setTimeout(() => {
      panel.dispose();
      reject(new Error("SVG→PNG conversion timed out"));
    }, 15_000);

    panel.webview.onDidReceiveMessage((msg) => {
      clearTimeout(timeout);
      panel.dispose();
      if (msg.type === "png") {
        const base64 = (msg.data as string).replace(/^data:image\/png;base64,/, "");
        resolve(Buffer.from(base64, "base64"));
      } else {
        reject(new Error(`SVG→PNG error: ${msg.error}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Filesystem helper
// ---------------------------------------------------------------------------

async function ensureParentDir(fileUri: vscode.Uri): Promise<void> {
  const parent = vscode.Uri.joinPath(fileUri, "..");
  await vscode.workspace.fs.createDirectory(parent);
}