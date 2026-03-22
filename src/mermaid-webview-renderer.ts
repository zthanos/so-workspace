/**
 * Shared Mermaid Rendering Utilities
 *
 * Provides the Kroki-primary / Bundled-Mermaid-fallback rendering pattern
 * used by both JavaRenderBackend and render-structurizr.ts.
 *
 * - renderMermaidViaKroki(): Kroki HTTP API (zlib-deflate → base64url → GET)
 * - renderMermaidViaWebview(): Bundled mermaid.esm.min.mjs in a hidden webview
 * - convertSvgToPngViaWebview(): SVG → PNG via hidden webview canvas (no sharp)
 */

import * as vscode from "vscode";
import * as path from "path";
import * as pako from "pako";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface MermaidWebviewRenderResult {
  svg: string;
  source: "kroki" | "bundled-mermaid";
}

// ---------------------------------------------------------------------------
// Kroki HTTP API renderer
// ---------------------------------------------------------------------------

/**
 * Render a diagram via the Kroki HTTP API.
 *
 * Encodes the content with zlib-deflate → base64url, then issues a GET
 * request to `{krokiEndpoint}/{diagramType}/svg/{encoded}`.
 *
 * @param content       Raw diagram source text
 * @param krokiEndpoint Base Kroki URL (e.g. "https://kroki.io")
 * @param diagramType   Kroki diagram type identifier (default: "mermaid")
 * @returns SVG string on success
 * @throws On HTTP error or 10-second timeout
 */
export async function renderMermaidViaKroki(
  content: string,
  krokiEndpoint: string,
  diagramType: string = "mermaid"
): Promise<string> {
  const endpoint = krokiEndpoint.replace(/\/$/, "");

  // Encode: zlib deflate → base64url
  const compressed = pako.deflate(content, { level: 9 });
  const base64url = Buffer.from(compressed)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const url = `${endpoint}/${diagramType}/svg/${base64url}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Kroki request timed out (10s)")), 10_000)
  );

  const response = await Promise.race([fetch(url), timeoutPromise]);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Kroki HTTP ${response.status}: ${body || response.statusText}`
    );
  }

  return response.text();
}


// ---------------------------------------------------------------------------
// Bundled Mermaid webview fallback
// ---------------------------------------------------------------------------

/**
 * Render a Mermaid diagram using the bundled mermaid.esm.min.mjs in a hidden
 * VS Code webview panel. No CDN, no mermaid-cli.
 *
 * @param content  Raw Mermaid diagram source text
 * @param context  VS Code extension context (needed for extension path)
 * @returns SVG string on success
 * @throws On render error or 30-second timeout
 */
export function renderMermaidViaWebview(
  content: string,
  context: vscode.ExtensionContext
): Promise<string> {
  return new Promise((resolve, reject) => {
    const mermaidDiskPath = vscode.Uri.file(
      path.join(context.extensionPath, "dist", "mermaid", "mermaid.esm.min.mjs")
    );

    const panel = vscode.window.createWebviewPanel(
      "mermaidWebviewRender",
      "Mermaid Render",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "dist")),
        ],
      }
    );

    const mermaidUri = panel.webview.asWebviewUri(mermaidDiskPath);
    const escapedSource = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

    panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<script type="module">
  import mermaid from '${mermaidUri}';
  const vscode = acquireVsCodeApi();
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  async function run() {
    try {
      const { svg } = await mermaid.render('mermaid-export', \`${escapedSource}\`);
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
      if (msg.type === "svg") {
        resolve(msg.svg as string);
      } else {
        reject(new Error(`Mermaid fallback error: ${msg.error}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// SVG → PNG via hidden webview canvas (no sharp, no mermaid-cli)
// ---------------------------------------------------------------------------

/**
 * Convert an SVG string to a PNG Buffer using a hidden VS Code webview with
 * an HTML canvas element. No native dependencies required.
 *
 * @param svg      SVG markup string
 * @param context  VS Code extension context
 * @returns PNG image as a Buffer
 * @throws On conversion error or 15-second timeout
 */
export function convertSvgToPngViaWebview(
  svg: string,
  context: vscode.ExtensionContext
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const panel = vscode.window.createWebviewPanel(
      "svgToPngConvert",
      "SVG to PNG",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true }
    );

    const svgBase64 = Buffer.from(svg, "utf-8").toString("base64");

    panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body>
<canvas id="canvas"></canvas>
<script>
  const vscode = acquireVsCodeApi();
  const svgStr = atob('${svgBase64}');

  function getSvgDimensions(svgMarkup) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
      const svgEl = doc.documentElement;

      const widthAttr = svgEl.getAttribute('width');
      const heightAttr = svgEl.getAttribute('height');
      const viewBoxAttr = svgEl.getAttribute('viewBox');

      const parseLength = (value) => {
        if (!value) return undefined;
        const match = String(value).match(/([0-9.]+)/);
        return match ? Number(match[1]) : undefined;
      };

      const width = parseLength(widthAttr);
      const height = parseLength(heightAttr);
      if (width && height) {
        return { width, height };
      }

      if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          return { width: parts[2], height: parts[3] };
        }
      }
    } catch (error) {
      // Fall through to defaults below.
    }

    return { width: 1200, height: 800 };
  }

  async function run() {
    let url;
    try {
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      url = URL.createObjectURL(blob);
      const img = new Image();
      const dimensions = getSvgDimensions(svgStr);

      img.onload = () => {
        try {
          const canvas = document.getElementById('canvas');
          canvas.width = Math.max(1, Math.ceil(img.naturalWidth || dimensions.width));
          canvas.height = Math.max(1, Math.ceil(img.naturalHeight || dimensions.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context is unavailable');
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          vscode.postMessage({ type: 'png', data });
        } catch (error) {
          if (url) URL.revokeObjectURL(url);
          vscode.postMessage({ type: 'error', error: String(error) });
        }
      };

      img.onerror = (e) => {
        if (url) URL.revokeObjectURL(url);
        vscode.postMessage({ type: 'error', error: 'Failed to load SVG into image element' });
      };

      img.src = url;
      await img.decode().catch(() => {});
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      vscode.postMessage({ type: 'error', error: String(error) });
    }
  }

  run();
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
        const base64 = (msg.data as string).replace(
          /^data:image\/png;base64,/,
          ""
        );
        resolve(Buffer.from(base64, "base64"));
      } else {
        reject(new Error(`SVG→PNG error: ${msg.error}`));
      }
    });
  });
}
