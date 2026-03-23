import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

let outputChannel: vscode.OutputChannel;

async function offerToOpenFile(filePath: string): Promise<void> {
  try {
    const fileName = path.basename(filePath);
    const choice = await vscode.window.showInformationMessage(
      `Successfully converted to ${fileName} at ${filePath}`,
      "Open File"
    );

    if (choice === "Open File") {
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
      outputChannel.appendLine(`[INFO] Opened file in editor: ${filePath}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to offer opening file: ${errorMessage}`);
  }
}

async function findPdfFiles(inboxPath: string): Promise<string[]> {
  try {
    const stats = await fs.stat(inboxPath);
    if (!stats.isDirectory()) {
      return [];
    }

    const files = await fs.readdir(inboxPath);
    return files
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => path.join(inboxPath, file));
  } catch {
    return [];
  }
}

async function selectPdfFile(files: string[]): Promise<string | undefined> {
  if (files.length === 0) {
    vscode.window.showInformationMessage("No PDF files found in inbox/brd directory");
    return undefined;
  }

  if (files.length === 1) {
    return files[0];
  }

  const selected = await vscode.window.showQuickPick(
    files.map((file) => ({
      label: path.basename(file),
      description: file,
      filePath: file,
    })),
    {
      placeHolder: "Select a PDF document to convert",
      title: "PDF to Markdown Conversion",
    }
  );

  return selected?.filePath;
}

async function promptOutputPath(defaultPath: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: "Enter the output path for the markdown file",
    value: defaultPath,
    placeHolder: "docs/00_brd/brd.md",
    title: "Output Location",
  });
}

async function checkOverwrite(outputPath: string): Promise<boolean> {
  try {
    await fs.access(outputPath);
    const choice = await vscode.window.showWarningMessage(
      `File ${path.basename(outputPath)} already exists. Overwrite?`,
      { modal: true },
      "Overwrite",
      "Cancel"
    );
    return choice === "Overwrite";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return true;
    }
    throw error;
  }
}

async function validateAndCreateOutputDirectory(outputPath: string): Promise<void> {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
}

function pdfTextToMarkdown(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const looksLikeHeading =
      /^[A-Z][A-Z0-9\s/&().:-]{3,}$/.test(line) ||
      /^\d+(\.\d+)*\s+/.test(line);

    if (looksLikeHeading) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      paragraphs.push(`## ${line}`);
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs.join("\n\n") + "\n";
}

async function performConversion(inputPath: string, outputPath: string): Promise<void> {
  outputChannel.appendLine(`[INFO] Reading PDF: ${inputPath}`);
  const buffer = await fs.readFile(inputPath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();

  if (!parsed.text || parsed.text.trim().length === 0) {
    throw new Error("The PDF did not yield any extractable text.");
  }

  const markdown = pdfTextToMarkdown(parsed.text);
  await fs.writeFile(outputPath, markdown, "utf-8");
  outputChannel.appendLine(`[INFO] Wrote markdown output: ${outputPath}`);
}

async function convertPdfToMarkdown(contextUri?: vscode.Uri): Promise<void> {
  outputChannel.appendLine("[INFO] ========================================");
  outputChannel.appendLine("[INFO] PDF to Markdown conversion started");
  outputChannel.appendLine(contextUri
    ? `[INFO] Invoked from context menu: ${contextUri.fsPath}`
    : "[INFO] Invoked from Command Palette");
  outputChannel.appendLine("[INFO] ========================================");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open. Please open a workspace to use this command.");
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  let selectedFile: string | undefined = contextUri?.fsPath;

  if (!selectedFile) {
    const inboxPath = path.join(workspaceRoot, "inbox", "brd");
    const pdfFiles = await findPdfFiles(inboxPath);
    selectedFile = await selectPdfFile(pdfFiles);
  }

  if (!selectedFile) {
    outputChannel.appendLine("[INFO] Conversion cancelled or no PDF selected");
    return;
  }

  const outputPath = await promptOutputPath("docs/00_brd/brd.md");
  if (!outputPath) {
    outputChannel.appendLine("[INFO] User cancelled output path input");
    return;
  }

  const fullOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(workspaceRoot, outputPath);

  const shouldProceed = await checkOverwrite(fullOutputPath);
  if (!shouldProceed) {
    outputChannel.appendLine("[INFO] User declined overwrite");
    return;
  }

  await validateAndCreateOutputDirectory(fullOutputPath);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Converting PDF document to Markdown",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: "Reading PDF..." });
        await performConversion(selectedFile!, fullOutputPath);
        progress.report({ increment: 100, message: "Complete!" });
      }
    );

    await offerToOpenFile(fullOutputPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] PDF conversion failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PDF conversion failed: ${errorMessage}`);
  }
}

export function registerPdfToMarkdownCommand(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("SO Workspace - PDF to Markdown");

  const disposable = vscode.commands.registerCommand(
    "so-workspace.convertPdfToMarkdown",
    (uri?: vscode.Uri) => convertPdfToMarkdown(uri)
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
}
