import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import * as mammoth from "mammoth";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";

/**
 * Output channel for logging Word to Markdown conversion operations.
 * Shared across all conversion operations for centralized logging.
 */
let outputChannel: vscode.OutputChannel;

/**
 * Shows a success message and offers to open the converted markdown file.
 * 
 * @param filePath - Path to the converted markdown file
 */
async function offerToOpenFile(filePath: string): Promise<void> {
  try {
    const fileName = path.basename(filePath);
    const choice = await vscode.window.showInformationMessage(
      `Successfully converted to ${fileName} at ${filePath}`,
      "Open File"
    );
    
    if (choice === "Open File") {
      try {
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        outputChannel.appendLine(`[INFO] Opened file in editor: ${filePath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[ERROR] Failed to open file in editor: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        }
        vscode.window.showErrorMessage(`Failed to open file: ${errorMessage}`);
      }
    } else {
      outputChannel.appendLine(`[INFO] User chose not to open the file`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to show success message: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    // Don't show error to user - conversion was successful
  }
}

/**
 * Main command handler for Word to Markdown conversion.
 * Orchestrates the entire conversion process from file selection to output.
 */
async function convertWordToMarkdown(): Promise<void> {
  outputChannel.appendLine("[INFO] ========================================");
  outputChannel.appendLine("[INFO] Word to Markdown conversion started");
  outputChannel.appendLine("[INFO] ========================================");
  
  try {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const errorMsg = "No workspace folder open. Please open a workspace to use this command.";
      outputChannel.appendLine(`[ERROR] ${errorMsg}`);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }
    
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const inboxPath = path.join(workspaceRoot, "inbox", "brd");
    
    // Find .docx files
    let docxFiles: string[];
    try {
      docxFiles = await findDocxFiles(inboxPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[ERROR] Failed to scan for Word documents: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
      }
      vscode.window.showErrorMessage(`Failed to scan for Word documents: ${errorMessage}`);
      return;
    }
    
    // Select file
    const selectedFile = await selectDocxFile(docxFiles);
    if (!selectedFile) {
      // User cancelled or no files found - graceful termination without error
      outputChannel.appendLine("[INFO] Conversion cancelled or no files available");
      outputChannel.appendLine("[INFO] ========================================");
      return;
    }
    
    // Prompt for output path
    const defaultOutputPath = "docs/00_brd/brd.md";
    const outputPath = await promptOutputPath(defaultOutputPath);
    if (!outputPath) {
      // User cancelled - graceful termination without error
      outputChannel.appendLine("[INFO] User cancelled output path selection");
      outputChannel.appendLine("[INFO] Conversion cancelled by user");
      outputChannel.appendLine("[INFO] ========================================");
      return;
    }
    
    // Resolve output path relative to workspace
    const fullOutputPath = path.isAbsolute(outputPath) 
      ? outputPath 
      : path.join(workspaceRoot, outputPath);
    
    // Check for overwrite
    let shouldProceed: boolean;
    try {
      shouldProceed = await checkOverwrite(fullOutputPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[ERROR] Failed to check output file: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
      }
      vscode.window.showErrorMessage(`Failed to check output file: ${errorMessage}`);
      return;
    }
    
    if (!shouldProceed) {
      // User declined overwrite - graceful termination without error
      outputChannel.appendLine("[INFO] User declined to overwrite existing file");
      outputChannel.appendLine("[INFO] Conversion cancelled by user");
      outputChannel.appendLine("[INFO] ========================================");
      return;
    }
    
    // Validate and create output directory
    try {
      await validateAndCreateOutputDirectory(fullOutputPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[ERROR] Failed to create output directory: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
      }
      vscode.window.showErrorMessage(`Cannot create output directory: ${errorMessage}`);
      return;
    }
    
    // Create assets directory path
    const outputBasename = path.basename(fullOutputPath, path.extname(fullOutputPath));
    const outputDir = path.dirname(fullOutputPath);
    const assetsDir = path.join(outputDir, "assets", outputBasename);
    
    // Perform conversion with progress indication
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Converting Word document to Markdown",
          cancellable: false
        },
        async (progress) => {
          progress.report({ increment: 0, message: "Reading document..." });
          
          await performConversion(selectedFile, fullOutputPath, assetsDir, progress);
          
          progress.report({ increment: 100, message: "Complete!" });
        }
      );
      
      outputChannel.appendLine("[INFO] ========================================");
      outputChannel.appendLine("[INFO] Conversion completed successfully");
      outputChannel.appendLine(`[INFO] Output file: ${fullOutputPath}`);
      outputChannel.appendLine("[INFO] ========================================");
      
      // Offer to open the file with success message including output path
      await offerToOpenFile(fullOutputPath);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[ERROR] Conversion operation failed: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
      }
      outputChannel.appendLine("[INFO] ========================================");
      vscode.window.showErrorMessage(`Conversion failed: ${errorMessage}`);
    }
    
  } catch (error) {
    // Catch-all for any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Unexpected error during conversion: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    outputChannel.appendLine("[INFO] ========================================");
    vscode.window.showErrorMessage(`Conversion failed: ${errorMessage}`);
  }
}

/**
 * Scans the inbox/brd directory for .docx files.
 * Handles directory not found gracefully by returning an empty array.
 * 
 * @param inboxPath - Path to the inbox/brd directory
 * @returns Array of full paths to .docx files found in the directory
 */
async function findDocxFiles(inboxPath: string): Promise<string[]> {
  try {
    // Check if directory exists
    const stats = await fs.stat(inboxPath);
    if (!stats.isDirectory()) {
      outputChannel.appendLine(`[WARN] Path is not a directory: ${inboxPath}`);
      return [];
    }

    // Read directory contents
    const files = await fs.readdir(inboxPath);
    
    // Filter for .docx files and return full paths
    const docxFiles = files
      .filter(file => file.toLowerCase().endsWith('.docx'))
      .map(file => path.join(inboxPath, file));
    
    outputChannel.appendLine(`[INFO] Found ${docxFiles.length} .docx file(s) in ${inboxPath}`);
    return docxFiles;
  } catch (error) {
    // Directory doesn't exist or can't be accessed
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      outputChannel.appendLine(`[WARN] Directory not found: ${inboxPath}`);
    } else {
      outputChannel.appendLine(`[WARN] Error accessing directory ${inboxPath}: ${error}`);
    }
    return [];
  }
}

/**
 * Presents file selection UI to the user based on the number of files found.
 * - Empty list: Shows informative message and returns undefined
 * - Single file: Auto-selects the file
 * - Multiple files: Shows quick pick menu with basenames
 * 
 * @param files - Array of full paths to .docx files
 * @returns Selected file path or undefined if cancelled/no files
 */
async function selectDocxFile(files: string[]): Promise<string | undefined> {
  // Handle empty file list
  if (files.length === 0) {
    vscode.window.showInformationMessage("No Word documents found in inbox/brd directory");
    outputChannel.appendLine("[INFO] No .docx files to select");
    return undefined;
  }

  // Handle single file - auto-select
  if (files.length === 1) {
    const selectedFile = files[0];
    outputChannel.appendLine(`[INFO] Auto-selected single file: ${path.basename(selectedFile)}`);
    return selectedFile;
  }

  // Handle multiple files - show quick pick
  const items = files.map(file => ({
    label: path.basename(file),
    description: file,
    filePath: file
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a Word document to convert",
    title: "Word to Markdown Conversion"
  });

  if (selected) {
    outputChannel.appendLine(`[INFO] User selected: ${selected.label}`);
    return selected.filePath;
  } else {
    outputChannel.appendLine("[INFO] User cancelled file selection");
    return undefined;
  }
}

/**
 * Prompts the user for the output markdown file path.
 * Shows an input box with a default path that the user can modify.
 * 
 * @param defaultPath - The default output path to suggest (e.g., "docs/00_brd/brd.md")
 * @returns The user-provided path or undefined if cancelled
 */
async function promptOutputPath(defaultPath: string): Promise<string | undefined> {
  const result = await vscode.window.showInputBox({
    prompt: "Enter the output path for the markdown file",
    value: defaultPath,
    placeHolder: "docs/00_brd/brd.md",
    title: "Output Location"
  });

  if (result) {
    outputChannel.appendLine(`[INFO] User specified output path: ${result}`);
    return result;
  } else {
    outputChannel.appendLine("[INFO] User cancelled output path input");
    return undefined;
  }
}

/**
 * Checks if the output file exists and prompts for overwrite confirmation.
 * 
 * @param outputPath - The path to check for existing file
 * @returns true to proceed with overwrite, false to cancel
 */
async function checkOverwrite(outputPath: string): Promise<boolean> {
  try {
    // Check if file exists
    await fs.access(outputPath);
    
    // File exists, prompt for confirmation
    outputChannel.appendLine(`[INFO] Output file already exists: ${outputPath}`);
    const choice = await vscode.window.showWarningMessage(
      `File ${path.basename(outputPath)} already exists. Overwrite?`,
      { modal: true },
      "Overwrite",
      "Cancel"
    );

    if (choice === "Overwrite") {
      outputChannel.appendLine("[INFO] User confirmed overwrite");
      return true;
    } else {
      outputChannel.appendLine("[INFO] User cancelled overwrite");
      return false;
    }
  } catch (error) {
    // File doesn't exist, proceed
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      outputChannel.appendLine(`[INFO] Output file does not exist, proceeding: ${outputPath}`);
      return true;
    }
    
    // Other error accessing file
    outputChannel.appendLine(`[WARN] Error checking file existence: ${error}`);
    throw error;
  }
}

/**
 * Validates the output path and creates the directory structure if needed.
 * Handles directory creation errors with appropriate error messages.
 * 
 * @param outputPath - The full path to the output file
 * @throws Error if directory cannot be created or path is invalid
 */
async function validateAndCreateOutputDirectory(outputPath: string): Promise<void> {
  try {
    // Get the directory path from the full file path
    const outputDir = path.dirname(outputPath);
    
    outputChannel.appendLine(`[INFO] Validating output directory: ${outputDir}`);
    
    // Check if directory exists
    try {
      const stats = await fs.stat(outputDir);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${outputDir}`);
      }
      outputChannel.appendLine(`[INFO] Output directory exists: ${outputDir}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist, create it
        outputChannel.appendLine(`[INFO] Creating output directory: ${outputDir}`);
        await fs.mkdir(outputDir, { recursive: true });
        outputChannel.appendLine(`[INFO] Successfully created directory: ${outputDir}`);
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to validate/create output directory: ${errorMessage}`);
    throw new Error(`Cannot create output directory: ${errorMessage}`);
  }
}

/**
 * Converts absolute image paths to relative paths for markdown references.
 * Ensures paths are correct relative to the markdown file location.
 * 
 * @param imagePath - The absolute path to the image file
 * @param markdownPath - The absolute path to the markdown file
 * @returns Relative path from markdown file to image
 */
function convertImageToRelativePath(imagePath: string, markdownPath: string): string {
  const markdownDir = path.dirname(markdownPath);
  const relativePath = path.relative(markdownDir, imagePath);
  
  // Normalize path separators for markdown (use forward slashes)
  const normalizedPath = relativePath.split(path.sep).join('/');
  
  outputChannel.appendLine(`[INFO] Converted image path: ${imagePath} -> ${normalizedPath}`);
  return normalizedPath;
}

/**
 * Performs the Word to Markdown conversion using mammoth.js and turndown.js.
 * Handles image extraction, HTML to markdown conversion, and file writing.
 * 
 * @param inputPath - Full path to the input .docx file
 * @param outputPath - Full path to the output .md file
 * @param assetsDir - Directory path for extracted images
 * @param progress - Optional VS Code progress reporter for status updates
 * @throws Error if file reading, conversion, or writing fails
 */
async function performConversion(
  inputPath: string,
  outputPath: string,
  assetsDir: string,
  progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<void> {
  outputChannel.appendLine(`[INFO] Starting conversion: ${inputPath} -> ${outputPath}`);
  outputChannel.appendLine(`[INFO] Assets directory: ${assetsDir}`);
  
  // Create assets directory if it doesn't exist
  try {
    await fs.mkdir(assetsDir, { recursive: true });
    outputChannel.appendLine(`[INFO] Assets directory created/verified: ${assetsDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to create assets directory: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    throw new Error(`Cannot create assets directory: ${errorMessage}`);
  }
  
  // Read the .docx file
  let buffer: Buffer;
  try {
    outputChannel.appendLine(`[INFO] Reading Word document...`);
    progress?.report({ increment: 10, message: "Reading document..." });
    buffer = await fs.readFile(inputPath);
    outputChannel.appendLine(`[INFO] Successfully read ${buffer.length} bytes from ${path.basename(inputPath)}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to read input file: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    throw new Error(`Cannot read file: ${path.basename(inputPath)}. Check file permissions.`);
  }
  
  // Configure mammoth with custom image converter
  let imageCounter = 0;
  const options = {
    convertImage: mammoth.images.imgElement(async (image) => {
      try {
        // Read image data
        const imageBuffer = await image.read();
        
        // Determine file extension from content type
        const contentType = image.contentType || 'image/png';
        const extension = contentType.split('/')[1] || 'png';
        
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const filename = `image-${timestamp}-${random}.${extension}`;
        
        // Save image to assets directory
        const imagePath = path.join(assetsDir, filename);
        await fs.writeFile(imagePath, imageBuffer);
        
        imageCounter++;
        outputChannel.appendLine(`[INFO] Extracted image ${imageCounter}: ${filename}`);
        progress?.report({ message: `Extracting images... (${imageCounter})` });
        
        // Generate relative path for markdown
        const relativePath = convertImageToRelativePath(imagePath, outputPath);
        
        return {
          src: relativePath
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[ERROR] Failed to extract image: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        }
        // Return a placeholder if image extraction fails
        return {
          src: 'image-extraction-failed.png'
        };
      }
    })
  };
  
  // Convert Word document to HTML using mammoth
  let result: { value: string; messages: Array<{ type: string; message: string }> };
  try {
    outputChannel.appendLine(`[INFO] Converting Word to HTML...`);
    progress?.report({ increment: 20, message: "Converting to HTML..." });
    result = await mammoth.convertToHtml({ buffer }, options);
    outputChannel.appendLine(`[INFO] Successfully converted to HTML`);
    
    // Log any conversion messages/warnings
    if (result.messages.length > 0) {
      outputChannel.appendLine(`[INFO] Conversion messages:`);
      result.messages.forEach((msg: { type: string; message: string }) => {
        outputChannel.appendLine(`  [${msg.type}] ${msg.message}`);
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Conversion failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    throw new Error(`Conversion failed: ${errorMessage}`);
  }
  
  // Configure turndown for markdown conversion
  let markdown: string;
  try {
    outputChannel.appendLine(`[INFO] Converting HTML to Markdown...`);
    progress?.report({ increment: 30, message: "Converting to Markdown..." });
    const turndownService = new TurndownService({
      headingStyle: 'atx',        // Use # style headings
      codeBlockStyle: 'fenced'    // Use ``` style code blocks
    });
    
    // Enable GFM (GitHub Flavored Markdown) features
    // This includes tables, strikethrough, and taskListItems
    const gfm = turndownPluginGfm.gfm;
    turndownService.use(gfm);
    
    outputChannel.appendLine(`[INFO] Turndown configured with GFM support (tables, strikethrough, taskListItems)`);
    
    // Convert HTML to markdown
    markdown = turndownService.turndown(result.value);
    outputChannel.appendLine(`[INFO] Successfully converted to Markdown (${markdown.length} characters)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] HTML to Markdown conversion failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    throw new Error(`HTML to Markdown conversion failed: ${errorMessage}`);
  }
  
  // Write markdown file
  try {
    outputChannel.appendLine(`[INFO] Writing markdown file...`);
    progress?.report({ increment: 30, message: "Writing markdown file..." });
    await fs.writeFile(outputPath, markdown, 'utf-8');
    outputChannel.appendLine(`[INFO] Successfully wrote ${markdown.length} characters to ${path.basename(outputPath)}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to write output file: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
    }
    throw new Error(`Cannot write output file: ${errorMessage}`);
  }
  
  outputChannel.appendLine(`[INFO] Conversion completed successfully`);
  outputChannel.appendLine(`[INFO] Extracted ${imageCounter} image(s)`);
  outputChannel.appendLine(`[INFO] Output: ${outputPath}`);
}

/**
 * Registers the Word to Markdown conversion command with VS Code.
 * This function should be called from the extension's activate() function.
 * 
 * @param context - The VS Code extension context for managing subscriptions
 */
export function registerWordToMarkdownCommand(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel("SO Workspace - Word to Markdown");
  
  // Register the command
  const disposable = vscode.commands.registerCommand(
    "so-workspace.convertWordToMarkdown",
    convertWordToMarkdown
  );
  
  // Add to subscriptions for proper cleanup
  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine("[INFO] Word to Markdown command registered");
}
