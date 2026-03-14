/**
 * DOCX Exporter
 *
 * Exports workspace documentation (Markdown files) to a Word (.docx) file
 * using the pure-JavaScript `docx` npm package — no native dependencies.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.6
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface DocxExportOptions {
  workspaceRoot: string;
  outputDir: string;
  documentationPaths: string[];
}

// ---------------------------------------------------------------------------
// DocxExporter
// ---------------------------------------------------------------------------

export class DocxExporter {
  /**
   * Export workspace documentation to a .docx file.
   *
   * 1. Glob for markdown files in the given documentation paths
   * 2. Parse each file and convert headings / paragraphs to docx elements
   * 3. Generate the .docx via the `docx` package Packer
   * 4. Write to the output directory
   *
   * @returns Absolute path of the generated .docx file
   */
  async export(options: DocxExportOptions): Promise<string> {
    const { workspaceRoot, outputDir, documentationPaths } = options;

    // --- Collect markdown files -------------------------------------------
    const mdFiles = this.collectMarkdownFiles(workspaceRoot, documentationPaths);

    if (mdFiles.length === 0) {
      const searched = documentationPaths.join(", ");
      throw new DocxExportError(
        `No workspace documentation files found in ${searched}`
      );
    }

    // --- Parse & convert each file ----------------------------------------
    const children: Paragraph[] = [];

    for (const filePath of mdFiles) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const paragraphs = this.markdownToParagraphs(content, filePath, workspaceRoot);
        children.push(...paragraphs);
      } catch (err) {
        // Markdown parsing error → log warning, skip file, continue
        console.warn(
          `[DocxExporter] Skipping ${filePath}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // --- Build document ---------------------------------------------------
    const doc = new Document({
      sections: [{ children }],
    });

    // --- Write .docx ------------------------------------------------------
    const outputDirAbs = path.isAbsolute(outputDir)
      ? outputDir
      : path.join(workspaceRoot, outputDir);

    if (!fs.existsSync(outputDirAbs)) {
      fs.mkdirSync(outputDirAbs, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputPath = path.join(outputDirAbs, `workspace-docs-${timestamp}.docx`);

    try {
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
    } catch (err) {
      throw new DocxExportError(
        `Failed to save .docx file: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return outputPath;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Collect all .md files under the given relative paths. */
  private collectMarkdownFiles(workspaceRoot: string, docPaths: string[]): string[] {
    const files: string[] = [];

    for (const docPath of docPaths) {
      const abs = path.isAbsolute(docPath)
        ? docPath
        : path.join(workspaceRoot, docPath);

      if (!fs.existsSync(abs)) {
        continue;
      }

      const stat = fs.statSync(abs);
      if (stat.isFile() && abs.endsWith(".md")) {
        files.push(abs);
      } else if (stat.isDirectory()) {
        this.walkDir(abs, files);
      }
    }

    return files.sort();
  }

  /** Recursively collect .md files from a directory. */
  private walkDir(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(full, out);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }

  /**
   * Convert a markdown string into an array of docx Paragraphs.
   *
   * Handles: headings (# – ######), blank lines, and plain text paragraphs.
   * Inline bold (**text**) and italic (*text*) are converted to TextRuns.
   */
  private markdownToParagraphs(
    markdown: string,
    filePath: string,
    workspaceRoot: string
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const relativePath = path.relative(workspaceRoot, filePath);

    // File separator heading
    paragraphs.push(
      new Paragraph({
        text: relativePath,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: paragraphs.length > 0,
      })
    );

    const lines = markdown.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip blank lines
      if (trimmed === "") {
        continue;
      }

      // Headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const headingLevel = this.toHeadingLevel(level);
        paragraphs.push(
          new Paragraph({ text, heading: headingLevel })
        );
        continue;
      }

      // Regular paragraph — parse inline formatting
      const runs = this.parseInlineFormatting(trimmed);
      paragraphs.push(new Paragraph({ children: runs }));
    }

    return paragraphs;
  }

  /** Map markdown heading depth (1-6) to docx HeadingLevel. */
  private toHeadingLevel(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
    switch (depth) {
      case 1: return HeadingLevel.HEADING_1;
      case 2: return HeadingLevel.HEADING_2;
      case 3: return HeadingLevel.HEADING_3;
      case 4: return HeadingLevel.HEADING_4;
      case 5: return HeadingLevel.HEADING_5;
      case 6: return HeadingLevel.HEADING_6;
      default: return HeadingLevel.HEADING_6;
    }
  }

  /** Parse inline bold (**text**) and italic (*text*) into TextRuns. */
  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    // Regex: bold (**...**), italic (*...*), or plain text
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[2]) {
        // Bold
        runs.push(new TextRun({ text: match[2], bold: true }));
      } else if (match[3]) {
        // Italic
        runs.push(new TextRun({ text: match[3], italics: true }));
      } else if (match[4]) {
        // Plain text
        runs.push(new TextRun({ text: match[4] }));
      }
    }

    if (runs.length === 0) {
      runs.push(new TextRun({ text }));
    }

    return runs;
  }
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

class DocxExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxExportError";
  }
}

// ---------------------------------------------------------------------------
// VS Code command registration
// ---------------------------------------------------------------------------

/**
 * Register the "Export to Word Document (.docx)" VS Code command.
 */
export function registerDocxExportCommand(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    "so-workspace.exportDocx",
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;

      // Default documentation paths — common locations for workspace docs
      const documentationPaths = ["docs"];
      const outputDir = path.join("out", "docx");

      const exporter = new DocxExporter();

      try {
        const outputPath = await exporter.export({
          workspaceRoot,
          outputDir,
          documentationPaths,
        });

        vscode.window.showInformationMessage(
          `Documentation exported to ${path.relative(workspaceRoot, outputPath)}`
        );
      } catch (err) {
        if (err instanceof DocxExportError) {
          vscode.window.showErrorMessage(err.message);
        } else {
          vscode.window.showErrorMessage(
            `Document generation failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}
