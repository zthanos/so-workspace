/**
 * Diagram Rendering System V2
 * 
 * A modular diagram rendering system that supports Mermaid.js and PlantUML diagrams.
 * This implementation uses a local plantuml-wasm server for PlantUML rendering
 * and the Mermaid.js library for Mermaid diagram rendering.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import * as plantumlEncoder from "plantuml-encoder";

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Configuration for the diagram rendering system
 */
export interface DiagramRenderConfig {
  /** Source directory containing diagram files */
  sourceDirectory: string;
  /** Output directory for rendered SVG files */
  outputDirectory: string;
  /** PlantUML server URL */
  plantUmlServerUrl: string;
  /** Maximum number of concurrent rendering operations */
  concurrencyLimit: number;
  /** In-memory cache for remote includes */
  includeCache: Map<string, string>;
  /** Structurizr server URL for validation */
  structurizrServerUrl?: string;
  /** Whether to validate DSL files before rendering */
  structurizrValidateBeforeRender?: boolean;
}

/**
 * Represents a discovered diagram file
 */
export interface DiagramFile {
  /** Full file system path */
  absolutePath: string;
  /** Path relative to source directory */
  relativePath: string;
  /** Type of diagram */
  type: "mermaid" | "plantuml" | "structurizr";
  /** File content (loaded on demand) */
  content?: string;
}

/**
 * Result of a rendering operation
 */
export interface RenderResult {
  /** Total number of files processed */
  totalFiles: number;
  /** Number of successfully rendered files */
  successCount: number;
  /** Number of failed files */
  failureCount: number;
  /** List of errors encountered */
  errors: RenderError[];
  /** Duration of the operation in milliseconds */
  duration: number;
}

/**
 * Error information for a failed rendering operation
 */
export interface RenderError {
  /** File path that failed */
  file: string;
  /** Type of diagram */
  type: "mermaid" | "plantuml" | "structurizr";
  /** Error message */
  message: string;
  /** Stack trace (optional) */
  stack?: string;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Command Handler - Registers and handles VSCode command invocation
 */
export interface CommandHandler {
  /** Register the command with VSCode */
  register(context: vscode.ExtensionContext): void;
  /** Execute the rendering command */
  execute(): Promise<void>;
}

/**
 * File Scanner - Discovers diagram files in the workspace
 */
export interface FileScanner {
  /** Scan directory for diagram files */
  scanDirectory(rootPath: string, patterns: string[]): Promise<DiagramFile[]>;
}

/**
 * Renderer Orchestrator - Coordinates the rendering process
 */
export interface RendererOrchestrator {
  /** Execute the rendering process */
  render(config: DiagramRenderConfig): Promise<RenderResult>;
}

/**
 * Mermaid Renderer - Renders Mermaid diagrams to SVG
 */
export interface MermaidRenderer {
  /** Render Mermaid content to SVG */
  render(content: string): Promise<string>;
}

/**
 * PlantUML Renderer - Renders PlantUML diagrams via local server
 */
export interface PlantUMLRenderer {
  /** Render PlantUML content to SVG */
  render(content: string, serverUrl: string): Promise<string>;
}

/**
 * Include Resolver - Resolves and inlines C4-PlantUML library includes
 */
export interface IncludeResolver {
  /** Resolve remote includes in PlantUML content */
  resolve(content: string): Promise<string>;
}

/**
 * Include Cache - Caches fetched remote includes
 */
export interface IncludeCache {
  /** Get cached content for a URL */
  get(url: string): Promise<string | null>;
  /** Set cached content for a URL */
  set(url: string, content: string): Promise<void>;
}

/**
 * Server Checker - Verifies PlantUML server availability
 */
export interface ServerChecker {
  /** Check if server is available */
  isAvailable(serverUrl: string): Promise<boolean>;
}

/**
 * Output Manager - Writes SVG files to disk
 */
export interface OutputManager {
  /** Write SVG content to output file */
  write(file: DiagramFile, svg: string, outputDir: string): Promise<void>;
  /** Write rendered output to disk (supports multiple formats) */
  writeOutput?(file: DiagramFile, output: import("./backend-strategy").RenderOutput, outputDir: string): Promise<void>;
}

/**
 * Progress Reporter - Provides user feedback
 */
export interface ProgressReporter {
  /** Start progress reporting */
  start(totalFiles: number, cliAvailability?: { structurizr: boolean }): void;
  /** Update progress with current file */
  update(currentFile: string, progress: number): void;
  /** Complete progress reporting with results */
  complete(result: RenderResult): void;
  /** Report an error */
  error(message: string): void;
  /** Get the output channel for external use */
  getOutputChannel(): vscode.OutputChannel;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Get default configuration for diagram rendering
 */
export function getDefaultConfig(): DiagramRenderConfig {
  return {
    sourceDirectory: "docs/03_architecture/diagrams/src",
    outputDirectory: "docs/03_architecture/diagrams/out",
    plantUmlServerUrl: "https://www.plantuml.com/plantuml",
    concurrencyLimit: 5,
    includeCache: new Map<string, string>(),
  };
}

/**
 * Read configuration from VSCode settings with fallback to defaults
 * Validates configuration values and falls back to defaults for invalid values
 */
export function readConfiguration(): DiagramRenderConfig {
  const config = vscode.workspace.getConfiguration("so-workspace.diagrams");
  const defaults = getDefaultConfig();

  // Read configuration values with validation
  const sourceDirectory = validateStringConfig(
    config.get<string>("sourceDirectory"),
    defaults.sourceDirectory
  );
  
  const outputDirectory = validateStringConfig(
    config.get<string>("outputDirectory"),
    defaults.outputDirectory
  );
  
  const plantUmlServerUrl = validateUrlConfig(
    config.get<string>("plantUmlServerUrl"),
    defaults.plantUmlServerUrl
  );
  
  const concurrencyLimit = validateNumberConfig(
    config.get<number>("concurrencyLimit"),
    defaults.concurrencyLimit,
    1,
    50
  );

  // Read Structurizr validation settings
  const structurizrServerUrl = validateStringConfig(
    config.get<string>("structurizrServerUrl"),
    "http://localhost:8080"
  );

  const structurizrValidateBeforeRender = config.get<boolean>("structurizrValidateBeforeRender") || false;

  return {
    sourceDirectory,
    outputDirectory,
    plantUmlServerUrl,
    concurrencyLimit,
    includeCache: new Map<string, string>(),
    structurizrServerUrl,
    structurizrValidateBeforeRender,
  };
}

/**
 * Validate string configuration value
 * @param value - Configuration value to validate
 * @param defaultValue - Default value to use if invalid
 * @returns Valid string value
 */
function validateStringConfig(value: string | undefined, defaultValue: string): string {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return defaultValue;
  }
  return value.trim();
}

/**
 * Validate URL configuration value
 * @param value - Configuration value to validate
 * @param defaultValue - Default value to use if invalid
 * @returns Valid URL string
 */
function validateUrlConfig(value: string | undefined, defaultValue: string): string {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return defaultValue;
  }
  
  const trimmed = value.trim();
  
  // Basic URL validation - must start with http:// or https://
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    console.warn(`Invalid PlantUML server URL: ${trimmed}. Using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return trimmed;
}

/**
 * Validate number configuration value
 * @param value - Configuration value to validate
 * @param defaultValue - Default value to use if invalid
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Valid number value
 */
function validateNumberConfig(
  value: number | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (value === undefined || typeof value !== "number" || isNaN(value)) {
    return defaultValue;
  }
  
  // Clamp value to valid range
  if (value < min) {
    console.warn(`Concurrency limit ${value} is below minimum ${min}. Using ${min}.`);
    return min;
  }
  
  if (value > max) {
    console.warn(`Concurrency limit ${value} is above maximum ${max}. Using ${max}.`);
    return max;
  }
  
  return Math.floor(value); // Ensure integer value
}

// ============================================================================
// File Scanner Implementation
// ============================================================================

/**
 * FileScanner implementation - Discovers diagram files in the workspace
 */
export class FileScannerImpl implements FileScanner {
  /**
   * Scan directory recursively for diagram files
   * @param rootPath - Root directory to scan
   * @param patterns - File extension patterns to match (e.g., ['.mmd', '.puml', '.dsl'])
   * @returns Array of discovered diagram files
   */
  async scanDirectory(rootPath: string, patterns: string[]): Promise<DiagramFile[]> {
    const results: DiagramFile[] = [];
    
    // Validate root path exists
    if (!fs.existsSync(rootPath)) {
      return results;
    }

    // Validate root path is a directory
    const stats = fs.statSync(rootPath);
    if (!stats.isDirectory()) {
      return results;
    }

    // Recursively scan directory
    await this.scanDirectoryRecursive(rootPath, rootPath, patterns, results);
    
    return results;
  }

  /**
   * Recursive helper function to scan directories
   * @param rootPath - Original root directory
   * @param currentPath - Current directory being scanned
   * @param patterns - File extension patterns to match
   * @param results - Accumulator for discovered files
   */
  private async scanDirectoryRecursive(
    rootPath: string,
    currentPath: string,
    patterns: string[],
    results: DiagramFile[]
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await this.scanDirectoryRecursive(rootPath, fullPath, patterns, results);
      } else if (entry.isFile()) {
        // Check if file matches any of the patterns
        const ext = path.extname(entry.name).toLowerCase();
        
        if (patterns.includes(ext)) {
          // Determine diagram type based on extension
          let type: "mermaid" | "plantuml" | "structurizr";
          if (ext === ".mmd") {
            type = "mermaid";
          } else if (ext === ".dsl") {
            type = "structurizr";
          } else {
            type = "plantuml";
          }
          
          // Calculate relative path from root
          const relativePath = path.relative(rootPath, fullPath);
          
          results.push({
            absolutePath: fullPath,
            relativePath: relativePath,
            type: type,
          });
        }
      }
    }
  }
}

// ============================================================================
// Include Resolver Implementation
// ============================================================================

/**
 * IncludeResolver implementation - Resolves and inlines C4-PlantUML library includes
 */
export class IncludeResolverImpl implements IncludeResolver {
  /** In-memory cache for fetched remote includes */
  private cache: Map<string, string>;

  /**
   * Regex pattern for detecting remote includes
   * Matches: !include https://...
   */
  private readonly includePattern = /!include\s+(https:\/\/[^\s]+)/g;

  constructor(cache?: Map<string, string>) {
    this.cache = cache || new Map<string, string>();
  }

  /**
   * Resolve remote includes in PlantUML content
   * @param content - PlantUML content with potential remote includes
   * @returns Content with includes replaced by fetched content
   */
  async resolve(content: string): Promise<string> {
    // Find all include directives
    const matches = Array.from(content.matchAll(this.includePattern));
    
    if (matches.length === 0) {
      // No includes found, return original content
      return content;
    }

    // Process each include
    let resolvedContent = content;
    
    for (const match of matches) {
      const fullMatch = match[0]; // Full match: "!include https://..."
      const url = match[1]; // Captured URL: "https://..."
      
      try {
        // Fetch content (with caching)
        const includeContent = await this.fetchWithCache(url);
        
        // Replace include directive with actual content
        resolvedContent = resolvedContent.replace(fullMatch, includeContent);
      } catch (error) {
        // Log error but continue processing other includes
        console.error(`Failed to fetch include from ${url}:`, error);
        throw new Error(`Failed to resolve include: ${url}`);
      }
    }
    
    return resolvedContent;
  }

  /**
   * Fetch content from URL with caching
   * @param url - URL to fetch
   * @returns Fetched content
   */
  private async fetchWithCache(url: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from network
    const content = await this.fetchRemoteContent(url);
    
    // Cache the result
    this.cache.set(url, content);
    
    return content;
  }

  /**
   * Fetch content from remote URL
   * @param url - URL to fetch
   * @returns Fetched content as string
   */
  private async fetchRemoteContent(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const protocol = url.startsWith("https://") ? https : http;
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.fetchRemoteContent(redirectUrl)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Collect response data
        let data = "";
        response.setEncoding("utf-8");
        
        response.on("data", (chunk) => {
          data += chunk;
        });
        
        response.on("end", () => {
          resolve(data);
        });
      });

      request.on("error", (error) => {
        reject(error);
      });

      // Set timeout
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }
}

// ============================================================================
// Output Manager Implementation
// ============================================================================

/**
 * OutputManager implementation - Writes SVG files to disk
 */
export class OutputManagerImpl implements OutputManager {
  /**
   * Write SVG content to output file
   * @param file - Diagram file information
   * @param svg - SVG content to write
   * @param outputDir - Output directory path
   */
  async write(file: DiagramFile, svg: string, outputDir: string): Promise<void> {
    // Calculate output path from relative path
    const outputPath = this.calculateOutputPath(file.relativePath, outputDir);
    
    // Create nested directories recursively
    await this.ensureDirectoryExists(path.dirname(outputPath));
    
    // Write SVG content to file
    await fs.promises.writeFile(outputPath, svg, "utf-8");
  }

  /**
   * Write rendered output to disk (supports multiple formats)
   * @param file - Diagram file information
   * @param output - Rendered output from backend (RenderOutput)
   * @param outputDir - Output directory path
   */
  async writeOutput(file: DiagramFile, output: import("./backend-strategy").RenderOutput, outputDir: string): Promise<void> {
    // Calculate output path with appropriate extension
    const outputPath = this.calculateOutputPathWithExtension(file.relativePath, output.extension, outputDir);
    
    // Create nested directories recursively
    await this.ensureDirectoryExists(path.dirname(outputPath));
    
    // Write content based on format
    if (output.format === "svg") {
      // SVG is text, write as UTF-8
      await fs.promises.writeFile(outputPath, output.content, "utf-8");
    } else if (output.format === "png") {
      // PNG is binary, write as buffer
      await fs.promises.writeFile(outputPath, output.content);
    } else {
      throw new Error(`Unsupported output format: ${output.format}`);
    }
  }

  /**
   * Calculate output file path with .svg extension
   * @param relativePath - Relative path from source directory
   * @param outputDir - Output directory path
   * @returns Full output file path with .svg extension
   */
  private calculateOutputPath(relativePath: string, outputDir: string): string {
    // Parse the relative path
    const parsed = path.parse(relativePath);
    
    // Change extension to .svg
    const svgFileName = parsed.name + ".svg";
    
    // Combine output directory with relative directory and new filename
    const outputPath = path.join(outputDir, parsed.dir, svgFileName);
    
    return outputPath;
  }

  /**
   * Calculate output file path with specified extension
   * @param relativePath - Relative path from source directory
   * @param extension - File extension (e.g., ".svg", ".png")
   * @param outputDir - Output directory path
   * @returns Full output file path with specified extension
   */
  private calculateOutputPathWithExtension(relativePath: string, extension: string, outputDir: string): string {
    // Parse the relative path
    const parsed = path.parse(relativePath);
    
    // Change extension to the output format
    const outputFileName = parsed.name + extension;
    
    // Combine output directory with relative directory and new filename
    const outputPath = path.join(outputDir, parsed.dir, outputFileName);
    
    return outputPath;
  }

  /**
   * Ensure directory exists, creating it recursively if needed
   * @param dirPath - Directory path to ensure exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // Directory doesn't exist, create it recursively
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}

// ============================================================================
// Server Checker Implementation
// ============================================================================

/**
 * ServerChecker implementation - Verifies PlantUML server availability
 */
export class ServerCheckerImpl implements ServerChecker {
  /**
   * Check if PlantUML server is available
   * @param serverUrl - PlantUML server URL to check
   * @returns true if server is available, false otherwise
   */
  async isAvailable(serverUrl: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        // Parse the server URL to determine protocol
        const protocol = serverUrl.startsWith("https://") ? https : http;
        
        // Make HTTP GET request to server root
        const request = protocol.get(serverUrl, (response) => {
          // Any response (even error codes) means server is reachable
          // We just want to know if the server is up
          resolve(true);
          
          // Consume response data to free up memory
          response.resume();
        });

        // Handle network errors
        request.on("error", () => {
          resolve(false);
        });

        // Set 5-second timeout as per requirements
        request.setTimeout(5000, () => {
          request.destroy();
          resolve(false);
        });
      } catch (error) {
        // Any exception means server is not available
        resolve(false);
      }
    });
  }
}

// ============================================================================
// Progress Reporter Implementation
// ============================================================================

/**
 * ProgressReporter implementation - Provides user feedback during rendering
 */
export class ProgressReporterImpl implements ProgressReporter {
  /** VSCode output channel for detailed logging */
  private outputChannel: vscode.OutputChannel;
  
  /** Progress callback for updating VSCode progress UI */
  private progressCallback?: (value: { message?: string; increment?: number }) => void;
  
  /** Total number of files being processed */
  private totalFiles: number = 0;
  
  /** Number of files processed so far */
  private processedFiles: number = 0;

  constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel || vscode.window.createOutputChannel("Diagram Renderer");
  }

  /**
   * Start progress reporting
   * @param totalFiles - Total number of files to process
   * @param cliAvailability - Optional CLI availability information
   */
  start(totalFiles: number, cliAvailability?: { structurizr: boolean }): void {
    this.totalFiles = totalFiles;
    this.processedFiles = 0;
    
    // Log to output channel
    this.outputChannel.clear();
    this.outputChannel.appendLine("=".repeat(80));
    this.outputChannel.appendLine("Diagram Rendering Started");
    this.outputChannel.appendLine("=".repeat(80));
    this.outputChannel.appendLine(`Total files to process: ${totalFiles}`);
    
    // Report CLI availability if provided
    if (cliAvailability) {
      this.outputChannel.appendLine("");
      this.outputChannel.appendLine("Rendering Backend Availability:");
      this.outputChannel.appendLine(`  Structurizr Pipeline: ${cliAvailability.structurizr ? "Available" : "Not Available"}`);
      
      if (!cliAvailability.structurizr) {
        this.outputChannel.appendLine("  Note: .dsl files will be skipped. Ensure:");
        this.outputChannel.appendLine("        1. Docker Desktop is running");
        this.outputChannel.appendLine("        2. render-dsl-to-svg.cmd script exists in workspace root");
        this.outputChannel.appendLine("        3. Run: docker-compose -f docker-compose.structurizr.yml up -d");
      }
    }
    
    this.outputChannel.appendLine("");
    
    // Show output channel
    this.outputChannel.show(true);
  }

  /**
   * Update progress with current file being processed
   * @param currentFile - Name/path of the current file
   * @param progress - Progress value (0-100)
   */
  update(currentFile: string, progress: number): void {
    this.processedFiles++;
    
    // Determine file type from extension for better messaging
    const ext = currentFile.toLowerCase().substring(currentFile.lastIndexOf('.'));
    let fileType = "";
    if (ext === ".dsl") {
      fileType = " (Structurizr DSL)";
    } else if (ext === ".puml") {
      fileType = " (PlantUML)";
    } else if (ext === ".mmd") {
      fileType = " (Mermaid)";
    }
    
    // Log to output channel
    this.outputChannel.appendLine(`[${this.processedFiles}/${this.totalFiles}] Processing: ${currentFile}${fileType}`);
    
    // Update VSCode progress UI if callback is set
    if (this.progressCallback) {
      const increment = this.totalFiles > 0 ? (100 / this.totalFiles) : 0;
      this.progressCallback({
        message: `Processing ${currentFile} (${this.processedFiles}/${this.totalFiles})`,
        increment: increment,
      });
    }
  }

  /**
   * Complete progress reporting with final results
   * @param result - Rendering result summary
   */
  complete(result: RenderResult): void {
    // Log to output channel
    this.outputChannel.appendLine("");
    this.outputChannel.appendLine("=".repeat(80));
    this.outputChannel.appendLine("Rendering Complete");
    this.outputChannel.appendLine("=".repeat(80));
    this.outputChannel.appendLine(`Total files: ${result.totalFiles}`);
    this.outputChannel.appendLine(`Successful: ${result.successCount}`);
    this.outputChannel.appendLine(`Failed: ${result.failureCount}`);
    this.outputChannel.appendLine(`Duration: ${result.duration}ms`);
    
    // Break down results by diagram type if available
    if (result.errors.length > 0) {
      const errorsByType = this.groupErrorsByType(result.errors);
      
      this.outputChannel.appendLine("");
      this.outputChannel.appendLine("Results by Type:");
      this.outputChannel.appendLine("-".repeat(80));
      
      const types = ["mermaid", "plantuml", "structurizr"] as const;
      for (const type of types) {
        const typeErrors = errorsByType.get(type) || [];
        const typeTotal = result.errors.filter(e => e.type === type).length;
        const typeSuccess = this.countSuccessByType(result, type);
        
        if (typeTotal > 0 || typeSuccess > 0) {
          const typeName = type === "structurizr" ? "Structurizr DSL" : 
                          type === "plantuml" ? "PlantUML" : "Mermaid";
          this.outputChannel.appendLine(`  ${typeName}: ${typeSuccess} succeeded, ${typeErrors.length} failed`);
        }
      }
    }
    
    // Log errors if any
    if (result.errors.length > 0) {
      this.outputChannel.appendLine("");
      this.outputChannel.appendLine("Errors:");
      this.outputChannel.appendLine("-".repeat(80));
      
      for (const error of result.errors) {
        this.outputChannel.appendLine(`File: ${error.file}`);
        this.outputChannel.appendLine(`Type: ${error.type}`);
        this.outputChannel.appendLine(`Message: ${error.message}`);
        
        if (error.stack) {
          this.outputChannel.appendLine(`Stack: ${error.stack}`);
        }
        
        this.outputChannel.appendLine("-".repeat(80));
      }
    }
    
    this.outputChannel.appendLine("");
    
    // Show notification to user
    if (result.failureCount === 0) {
      vscode.window.showInformationMessage(
        `Successfully rendered ${result.successCount} diagram(s) in ${result.duration}ms`
      );
    } else if (result.successCount > 0) {
      vscode.window.showWarningMessage(
        `Rendered ${result.successCount} diagram(s), ${result.failureCount} failed. Check output for details.`
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to render all ${result.totalFiles} diagram(s). Check output for details.`
      );
    }
  }

  /**
   * Group errors by diagram type
   * @param errors - Array of render errors
   * @returns Map of diagram type to errors
   */
  private groupErrorsByType(errors: RenderError[]): Map<string, RenderError[]> {
    const grouped = new Map<string, RenderError[]>();
    
    for (const error of errors) {
      const existing = grouped.get(error.type) || [];
      existing.push(error);
      grouped.set(error.type, existing);
    }
    
    return grouped;
  }

  /**
   * Count successful renders by type
   * @param result - Rendering result
   * @param type - Diagram type to count
   * @returns Number of successful renders for the type
   */
  private countSuccessByType(result: RenderResult, type: string): number {
    // This is an approximation since we don't have per-type success counts
    // We calculate it as: total files of this type - errors of this type
    const errorsOfType = result.errors.filter(e => e.type === type).length;
    
    // We can't determine the exact count without more information
    // For now, we'll just return 0 if there are errors, otherwise assume success
    // This is a limitation that could be improved by enhancing the RenderResult interface
    return errorsOfType > 0 ? result.successCount : 0;
  }

  /**
   * Report an error
   * @param message - Error message to display
   */
  error(message: string): void {
    // Log to output channel
    this.outputChannel.appendLine("");
    this.outputChannel.appendLine("ERROR: " + message);
    this.outputChannel.appendLine("");
    
    // Show error notification
    vscode.window.showErrorMessage(`Diagram Rendering Error: ${message}`);
  }

  /**
   * Set the progress callback for VSCode progress UI
   * This is called by withProgress to provide the progress update function
   * @param callback - Progress callback function
   */
  setProgressCallback(callback: (value: { message?: string; increment?: number }) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Get the output channel for external use
   * @returns VSCode output channel
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }
}

// ============================================================================
// Mermaid Renderer Implementation
// ============================================================================

/**
 * MermaidRenderer implementation - Renders Mermaid diagrams to SVG using Puppeteer
 */
export class MermaidRendererImpl implements MermaidRenderer {
  /** Counter for generating unique IDs for Mermaid diagrams */
  private idCounter: number = 0;
  
  /** Puppeteer browser instance (shared across renders) */
  private browser: any = null;
  
  /** Flag to track if browser has been initialized */
  private initialized: boolean = false;

  /**
   * Initialize Puppeteer browser
   * This is called lazily on first render
   */
  private async initializeBrowser(): Promise<void> {
    if (this.initialized && this.browser) {
      return;
    }

    try {
      const puppeteer = await import("puppeteer");
      
      this.browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Render Mermaid content to SVG
   * @param content - Mermaid content to render
   * @returns SVG content as string
   */
  async render(content: string): Promise<string> {
    // Validate content is not empty
    if (!content || content.trim() === "") {
      throw new Error("Mermaid content is empty");
    }

    // Initialize browser if not already done
    await this.initializeBrowser();

    try {
      // Create a new page
      const page = await this.browser.newPage();
      
      try {
        // Generate unique ID for this diagram
        const id = `mermaid-diagram-${this.idCounter++}`;
        
        // Set up the page with Mermaid
        await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    window.mermaid = mermaid;
  </script>
</head>
<body>
  <div id="diagram-container"></div>
</body>
</html>
        `);
        
        // Wait for Mermaid to load
        await page.waitForFunction(() => (window as any).mermaid !== undefined, { timeout: 10000 });
        
        // Render the diagram
        const svg = await page.evaluate(async (diagramId: string, diagramContent: string) => {
          try {
            const result = await (window as any).mermaid.render(diagramId, diagramContent);
            return result.svg;
          } catch (err: any) {
            throw new Error(`Mermaid render error: ${err.message}`);
          }
        }, id, content);
        
        // Validate SVG
        if (!svg || typeof svg !== "string") {
          throw new Error("Mermaid render returned invalid SVG content");
        }
        
        return svg;
        
      } finally {
        // Always close the page
        await page.close();
      }
      
    } catch (error) {
      // Handle Mermaid syntax errors gracefully
      if (error instanceof Error) {
        // Check if it's a syntax error
        if (error.message.includes("Parse error") || 
            error.message.includes("Syntax error") ||
            error.message.includes("Lexical error") ||
            error.message.includes("Mermaid render error")) {
          throw new Error(`Invalid Mermaid syntax: ${error.message}`);
        }
        
        // Re-throw other errors with context
        throw new Error(`Failed to render Mermaid diagram: ${error.message}`);
      }
      
      // Handle non-Error objects
      throw new Error(`Failed to render Mermaid diagram: ${String(error)}`);
    }
  }
  
  /**
   * Cleanup method to close the browser
   * Should be called when done with all rendering
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.initialized = false;
    }
  }
}

// ============================================================================
// PlantUML Renderer Implementation
// ============================================================================

/**
 * PlantUMLRenderer implementation - Renders PlantUML diagrams via local server
 */
export class PlantUMLRendererImpl implements PlantUMLRenderer {
  /** Include resolver for preprocessing PlantUML content */
  private includeResolver: IncludeResolver;

  constructor(includeResolver?: IncludeResolver) {
    this.includeResolver = includeResolver || new IncludeResolverImpl();
  }

  /**
   * Render PlantUML content to SVG
   * @param content - PlantUML content to render
   * @param serverUrl - PlantUML server URL
   * @returns SVG content as string
   */
  async render(content: string, serverUrl: string): Promise<string> {
    // Step 1: Preprocess content through Include Resolver
    let processedContent: string;
    try {
      processedContent = await this.includeResolver.resolve(content);
    } catch (error) {
      throw new Error(`Failed to resolve includes: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2: Encode content using plantuml-encoder
    let encoded: string;
    try {
      encoded = plantumlEncoder.encode(processedContent);
    } catch (error) {
      throw new Error(`Failed to encode PlantUML content: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 3: Make HTTP GET request to server
    const url = `${serverUrl}/svg/${encoded}`;
    
    try {
      const svg = await this.fetchSvgFromServer(url);
      return svg;
    } catch (error) {
      throw new Error(`Failed to render PlantUML diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch SVG from PlantUML server
   * @param url - Full URL to request SVG from
   * @returns SVG content as string
   */
  private async fetchSvgFromServer(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const protocol = url.startsWith("https://") ? https : http;
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.fetchSvgFromServer(redirectUrl)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`Server returned HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Collect response data
        let data = "";
        response.setEncoding("utf-8");
        
        response.on("data", (chunk) => {
          data += chunk;
        });
        
        response.on("end", () => {
          // Validate that we received SVG content
          if (!data.trim().startsWith("<?xml") && !data.trim().startsWith("<svg")) {
            reject(new Error("Server response is not valid SVG content"));
            return;
          }
          resolve(data);
        });
      });

      request.on("error", (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      // Set timeout (30 seconds for rendering)
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Request timeout - server took too long to respond"));
      });
    });
  }
}

// ============================================================================
// Renderer Orchestrator Implementation
// ============================================================================

/**
 * RendererOrchestrator implementation - Coordinates the rendering process
 */
export class RendererOrchestratorImpl implements RendererOrchestrator {
  /** File scanner for discovering diagram files */
  private fileScanner: FileScanner;
  
  /** Backend strategy for rendering diagrams */
  private backend: import("./backend-strategy").RenderBackend;
  
  /** Structurizr renderer for .dsl files */
  private structurizrRenderer?: import("./structurizr-pipeline-renderer").StructurizrPipelineRenderer;
  
  /** Structurizr validator for pre-render validation */
  private structurizrValidator?: import("./structurizr-validator").StructurizrValidator;
  
  /** Output manager for writing SVG files */
  private outputManager: OutputManager;
  
  /** Progress reporter for user feedback */
  private progressReporter: ProgressReporter;

  constructor(
    backend: import("./backend-strategy").RenderBackend,
    fileScanner?: FileScanner,
    outputManager?: OutputManager,
    progressReporter?: ProgressReporter,
    structurizrRenderer?: import("./structurizr-pipeline-renderer").StructurizrPipelineRenderer,
    structurizrValidator?: import("./structurizr-validator").StructurizrValidator
  ) {
    this.backend = backend;
    this.fileScanner = fileScanner || new FileScannerImpl();
    this.outputManager = outputManager || new OutputManagerImpl();
    this.progressReporter = progressReporter || new ProgressReporterImpl();
    this.structurizrRenderer = structurizrRenderer;
    this.structurizrValidator = structurizrValidator;
  }

  /**
   * Execute the rendering process
   * @param config - Rendering configuration
   * @returns Rendering result with success/failure counts and errors
   */
  async render(config: DiagramRenderConfig): Promise<RenderResult> {
    const startTime = Date.now();
    
    // Step 1: Validate configuration
    this.validateConfiguration(config);
    
    // Step 2: Check backend availability
    const availability = await this.backend.isAvailable();
    
    // Step 3: Check Structurizr CLI availability
    let structurizrAvailable = false;
    if (this.structurizrRenderer) {
      structurizrAvailable = await this.structurizrRenderer.isAvailable();
    }
    
    // If neither backend nor Structurizr is available, return error
    if (!availability.available && !structurizrAvailable) {
      this.progressReporter.error(
        `No rendering backend available: ${availability.message || 'Unknown error'}`
      );
      
      return {
        totalFiles: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    }
    
    // Step 4: Scan files
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("No workspace folder found");
    }
    
    const sourceDir = path.join(workspaceFolder.uri.fsPath, config.sourceDirectory);
    const files = await this.fileScanner.scanDirectory(sourceDir, [".mmd", ".puml", ".dsl"]);
    
    // Handle no files found
    if (files.length === 0) {
      const result: RenderResult = {
        totalFiles: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
      
      vscode.window.showInformationMessage(
        `No diagram files found in ${config.sourceDirectory}`
      );
      
      return result;
    }
    
    // Step 5: Partition files by type
    const structurizrFiles = files.filter(f => f.type === "structurizr");
    const otherFiles = files.filter(f => f.type !== "structurizr");
    
    // Filter other files by backend's supported types
    const backendSupportedFiles = otherFiles.filter(f => 
      availability.supportedTypes.includes(f.type as import("./backend-strategy").DiagramType)
    );
    
    // Determine which files can be processed
    const processableStructurizrFiles = structurizrAvailable ? structurizrFiles : [];
    const processableBackendFiles = availability.available ? backendSupportedFiles : [];
    
    // Calculate total processable files
    const totalProcessableFiles = processableStructurizrFiles.length + processableBackendFiles.length;
    
    // Log warnings for skipped files
    if (structurizrFiles.length > 0 && !structurizrAvailable) {
      console.log(
        `Skipping ${structurizrFiles.length} Structurizr file(s) - Rendering pipeline not available. ` +
        `Ensure Docker is running and render-dsl-to-svg.cmd script exists.`
      );
    }
    
    const skippedBackendCount = otherFiles.length - backendSupportedFiles.length;
    if (skippedBackendCount > 0) {
      console.log(`Skipping ${skippedBackendCount} file(s) - diagram type not supported by ${this.backend.name} backend`);
    }
    
    // Handle no processable files
    if (totalProcessableFiles === 0) {
      const result: RenderResult = {
        totalFiles: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
      
      vscode.window.showInformationMessage(
        `No supported diagram files found for available rendering backends`
      );
      
      return result;
    }
    
    // Step 6: Start progress reporting
    this.progressReporter.start(totalProcessableFiles, {
      structurizr: structurizrAvailable
    });
    
    // Step 7: Render files
    const outputDir = path.join(workspaceFolder.uri.fsPath, config.outputDirectory);
    
    // Render backend files
    const backendResults = await this.renderFilesWithConcurrencyLimit(
      processableBackendFiles,
      outputDir,
      config.concurrencyLimit
    );
    
    // Render Structurizr files with optional validation
    const structurizrResults = await this.renderStructurizrFiles(
      processableStructurizrFiles,
      outputDir,
      config.structurizrValidateBeforeRender || false,
      config.structurizrServerUrl || "http://localhost:8080"
    );
    
    // Step 8: Aggregate results from both renderers
    const allResults = [...backendResults, ...structurizrResults];
    const allFiles = [...processableBackendFiles, ...processableStructurizrFiles];
    
    const successCount = allResults.filter(r => r.status === "fulfilled").length;
    const failureCount = allResults.filter(r => r.status === "rejected").length;
    const errors: RenderError[] = [];
    
    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      if (result.status === "rejected") {
        const file = allFiles[i];
        errors.push({
          file: file.relativePath,
          type: file.type,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
          stack: result.reason instanceof Error ? result.reason.stack : undefined,
        });
      }
    }
    
    // Step 9: Complete progress reporting
    const finalResult: RenderResult = {
      totalFiles: totalProcessableFiles,
      successCount: successCount,
      failureCount: failureCount,
      errors: errors,
      duration: Date.now() - startTime,
    };
    
    this.progressReporter.complete(finalResult);
    
    return finalResult;
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfiguration(config: DiagramRenderConfig): void {
    if (!config.sourceDirectory || config.sourceDirectory.trim() === "") {
      throw new Error("Source directory is required");
    }
    
    if (!config.outputDirectory || config.outputDirectory.trim() === "") {
      throw new Error("Output directory is required");
    }
    
    if (!config.plantUmlServerUrl || config.plantUmlServerUrl.trim() === "") {
      throw new Error("PlantUML server URL is required");
    }
    
    if (config.concurrencyLimit <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }
  }

  /**
   * Render files with concurrency limit enforcement
   * @param files - Files to render
   * @param outputDir - Output directory path
   * @param concurrencyLimit - Maximum number of concurrent operations
   * @returns Array of settled promises
   */
  private async renderFilesWithConcurrencyLimit(
    files: DiagramFile[],
    outputDir: string,
    concurrencyLimit: number
  ): Promise<PromiseSettledResult<void>[]> {
    const results: PromiseSettledResult<void>[] = [];
    
    // Process files in batches to enforce concurrency limit
    for (let i = 0; i < files.length; i += concurrencyLimit) {
      const batch = files.slice(i, i + concurrencyLimit);
      
      // Render batch concurrently
      const batchPromises = batch.map(file => this.renderFile(file, outputDir));
      const batchResults = await Promise.allSettled(batchPromises);
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Render Structurizr DSL files using StructurizrRenderer
   * @param files - Structurizr files to render
   * @param outputDir - Output directory path
   * @param validateBeforeRender - Whether to validate files before rendering
   * @param serverUrl - Structurizr server URL for validation
   * @returns Array of settled promises
   */
  private async renderStructurizrFiles(
    files: DiagramFile[],
    outputDir: string,
    validateBeforeRender: boolean = false,
    serverUrl: string = "http://localhost:8080"
  ): Promise<PromiseSettledResult<void>[]> {
    const results: PromiseSettledResult<void>[] = [];
    
    // If no Structurizr renderer is available, return empty results
    if (!this.structurizrRenderer) {
      return results;
    }
    
    // Optionally validate files before rendering (Requirement 13.8)
    if (validateBeforeRender && this.structurizrValidator && files.length > 0) {
      const shouldProceed = await this.validateBeforeRendering(files, serverUrl);
      if (!shouldProceed) {
        // User chose not to proceed with rendering
        // Return rejected promises for all files
        for (const file of files) {
          results.push({
            status: "rejected",
            reason: new Error("Rendering cancelled due to validation errors"),
          });
        }
        return results;
      }
    }
    
    // Render each Structurizr file
    for (const file of files) {
      const promise = this.renderStructurizrFile(file, outputDir);
      const result = await Promise.allSettled([promise]);
      results.push(result[0]);
    }
    
    return results;
  }

  /**
   * Validate DSL files before rendering
   * Displays validation errors and asks user whether to proceed
   * 
   * @param files - DSL files to validate
   * @param serverUrl - Structurizr server URL for validation
   * @returns Promise<boolean> - true if user wants to proceed, false otherwise
   */
  private async validateBeforeRendering(
    files: DiagramFile[],
    serverUrl: string
  ): Promise<boolean> {
    if (!this.structurizrValidator) {
      return true; // No validator available, proceed with rendering
    }

    this.progressReporter.getOutputChannel().appendLine("");
    this.progressReporter.getOutputChannel().appendLine("=".repeat(80));
    this.progressReporter.getOutputChannel().appendLine("Validating DSL files before rendering...");
    this.progressReporter.getOutputChannel().appendLine("=".repeat(80));

    // Validate all DSL files
    const filePaths = files.map(f => f.absolutePath);
    const validationResults = await this.structurizrValidator.validateAll(filePaths, serverUrl);

    // Check if any files have errors
    const filesWithErrors = validationResults.filter(r => !r.valid);
    const filesWithWarnings = validationResults.filter(r => r.warnings.length > 0);

    // Display validation results
    for (const result of validationResults) {
      const fileName = path.basename(result.filePath);
      
      if (result.valid && result.warnings.length === 0) {
        this.progressReporter.getOutputChannel().appendLine(`✓ ${fileName}: Valid`);
      } else if (result.valid && result.warnings.length > 0) {
        this.progressReporter.getOutputChannel().appendLine(`⚠ ${fileName}: Valid with warnings`);
        for (const warning of result.warnings) {
          this.progressReporter.getOutputChannel().appendLine(`  Line ${warning.line}: ${warning.message}`);
        }
      } else {
        this.progressReporter.getOutputChannel().appendLine(`✗ ${fileName}: Invalid`);
        for (const error of result.errors) {
          this.progressReporter.getOutputChannel().appendLine(`  Line ${error.line}: ${error.message}`);
        }
      }
    }

    this.progressReporter.getOutputChannel().appendLine("=".repeat(80));

    // If there are no errors, proceed automatically
    if (filesWithErrors.length === 0) {
      if (filesWithWarnings.length > 0) {
        this.progressReporter.getOutputChannel().appendLine(
          `All files are valid, but ${filesWithWarnings.length} file(s) have warnings. Proceeding with rendering.`
        );
      }
      return true;
    }

    // If there are errors, ask user whether to proceed
    const errorMessage = `${filesWithErrors.length} DSL file(s) have validation errors. Do you want to proceed with rendering anyway?`;
    
    const choice = await vscode.window.showWarningMessage(
      errorMessage,
      { modal: true },
      "Proceed with Rendering",
      "Cancel Rendering"
    );

    if (choice === "Proceed with Rendering") {
      this.progressReporter.getOutputChannel().appendLine("User chose to proceed with rendering despite validation errors.");
      return true;
    } else {
      this.progressReporter.getOutputChannel().appendLine("User cancelled rendering due to validation errors.");
      vscode.window.showInformationMessage("Rendering cancelled. Fix validation errors and try again.");
      return false;
    }
  }

  /**
   * Render a single Structurizr DSL file
   * @param file - Structurizr file to render
   * @param outputDir - Output directory path
   */
  private async renderStructurizrFile(
    file: DiagramFile,
    outputDir: string
  ): Promise<void> {
    // Update progress
    this.progressReporter.update(file.relativePath, 0);
    
    if (!this.structurizrRenderer) {
      throw new Error("Structurizr renderer not available");
    }
    
    try {
      // Render using Structurizr renderer
      const result = await this.structurizrRenderer.render(file.absolutePath, outputDir);
      
      // Check for errors in the result
      if (result.errors.length > 0) {
        throw new Error(`Structurizr rendering errors: ${result.errors.join("; ")}`);
      }
      
      // Check if any views were generated
      if (result.views.length === 0) {
        throw new Error("No views were generated from the DSL file");
      }
      
    } catch (error) {
      // Re-throw error to be caught by Promise.allSettled
      throw error;
    }
  }

  /**
   * Render a single file using the backend strategy
   * @param file - File to render
   * @param outputDir - Output directory path
   */
  private async renderFile(
    file: DiagramFile,
    outputDir: string
  ): Promise<void> {
    // Update progress
    this.progressReporter.update(file.relativePath, 0);
    
    try {
      // Read file content
      const content = await fs.promises.readFile(file.absolutePath, "utf-8");
      
      // Render using backend strategy
      const output = await this.backend.render(file, content);
      
      // Write output using the output manager's new writeOutput method
      if (this.outputManager.writeOutput) {
        await this.outputManager.writeOutput(file, output, outputDir);
      } else {
        // Fallback to direct write if writeOutput is not available
        await this.writeOutput(file, output, outputDir);
      }
      
    } catch (error) {
      // Re-throw error to be caught by Promise.allSettled
      throw error;
    }
  }

  /**
   * Write rendered output to disk
   * @param file - Original diagram file
   * @param output - Rendered output from backend
   * @param outputDir - Output directory path
   */
  private async writeOutput(
    file: DiagramFile,
    output: import("./backend-strategy").RenderOutput,
    outputDir: string
  ): Promise<void> {
    // Calculate output path from relative path
    const outputPath = this.calculateOutputPath(file.relativePath, output.extension, outputDir);
    
    // Create nested directories recursively
    await this.ensureDirectoryExists(path.dirname(outputPath));
    
    // Write content based on format
    if (output.format === "svg") {
      // SVG is text, write as UTF-8
      await fs.promises.writeFile(outputPath, output.content, "utf-8");
    } else {
      // PNG is binary, write as buffer
      await fs.promises.writeFile(outputPath, output.content);
    }
  }

  /**
   * Calculate output file path with appropriate extension
   * @param relativePath - Relative path from source directory
   * @param extension - File extension (e.g., ".svg", ".png")
   * @param outputDir - Output directory path
   * @returns Full output file path
   */
  private calculateOutputPath(relativePath: string, extension: string, outputDir: string): string {
    // Parse the relative path
    const parsed = path.parse(relativePath);
    
    // Change extension to the output format
    const outputFileName = parsed.name + extension;
    
    // Combine output directory with relative directory and new filename
    const outputPath = path.join(outputDir, parsed.dir, outputFileName);
    
    return outputPath;
  }

  /**
   * Ensure directory exists, creating it recursively if needed
   * @param dirPath - Directory path to ensure exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // Directory doesn't exist, create it recursively
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}

// ============================================================================
// Command Handler Implementation
// ============================================================================

/**
 * CommandHandler implementation - Registers and handles VSCode command invocation
 */
export class CommandHandlerImpl implements CommandHandler {
  /** Flag to prevent concurrent executions */
  private isRendering: boolean = false;
  
  /** Renderer orchestrator for coordinating the rendering process */
  private orchestrator: RendererOrchestrator;
  
  /** Progress reporter for user feedback */
  private progressReporter: ProgressReporter;

  constructor(
    orchestrator: RendererOrchestrator,
    progressReporter?: ProgressReporter
  ) {
    this.orchestrator = orchestrator;
    this.progressReporter = progressReporter || new ProgressReporterImpl();
  }

  /**
   * Register the command with VSCode
   * @param context - VSCode extension context
   */
  register(context: vscode.ExtensionContext): void {
    // Register the command
    const disposable = vscode.commands.registerCommand(
      "so-workspace.renderDiagrams",
      () => this.execute()
    );
    
    // Add to subscriptions for cleanup
    context.subscriptions.push(disposable);
  }

  /**
   * Execute the rendering command
   * Prevents concurrent executions and handles top-level errors
   */
  async execute(): Promise<void> {
    // Prevent concurrent executions (Requirement 1.3)
    if (this.isRendering) {
      vscode.window.showWarningMessage(
        "Diagram rendering is already in progress. Please wait for it to complete."
      );
      return;
    }

    try {
      // Set rendering flag
      this.isRendering = true;

      // Validate workspace
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage(
          "No workspace folder found. Please open a workspace to render diagrams."
        );
        return;
      }

      // Read configuration
      const config = readConfiguration();

      // Execute rendering with progress UI
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Rendering Diagrams",
          cancellable: false,
        },
        async (progress) => {
          // Set progress callback for the reporter
          if (this.progressReporter instanceof ProgressReporterImpl) {
            this.progressReporter.setProgressCallback(progress.report.bind(progress));
          }

          // Execute rendering through orchestrator
          try {
            await this.orchestrator.render(config);
          } catch (error) {
            // Handle top-level errors (Requirement 1.5)
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.progressReporter.error(errorMessage);
            
            vscode.window.showErrorMessage(
              `Diagram rendering failed: ${errorMessage}`
            );
          }
        }
      );

    } catch (error) {
      // Handle any unexpected errors at the top level
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      vscode.window.showErrorMessage(
        `Unexpected error during diagram rendering: ${errorMessage}`
      );
      
      console.error("Diagram rendering error:", error);
      
    } finally {
      // Always clear the rendering flag
      this.isRendering = false;
    }
  }
}
