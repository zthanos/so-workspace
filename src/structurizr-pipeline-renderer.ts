/**
 * Structurizr DSL Pipeline Renderer
 * 
 * Renders Structurizr DSL files to SVG using the automated rendering pipeline.
 * This uses the render-dsl-to-svg.cmd script which implements:
 * DSL → PlantUML → Kroki → SVG pipeline
 * 
 * Advantages over direct CLI export:
 * - Higher quality SVG output via Kroki rendering
 * - Automatic Docker container management
 * - Built-in error handling and validation
 * - Progress reporting and summary
 * 
 * Requirements:
 * - Docker Desktop must be installed and running
 * - docker-compose.structurizr.yml must be configured
 * - render-dsl-to-svg.cmd script must be in workspace root
 */

import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";

const execFile = promisify(child_process.execFile);

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Result from rendering Structurizr DSL files via pipeline
 */
export interface PipelineRenderResult {
  /** List of views that were successfully rendered */
  views: StructurizrView[];
  
  /** List of errors encountered during rendering */
  errors: string[];
  
  /** Total execution time in seconds */
  executionTime?: string;
}

/**
 * Information about a rendered view from a Structurizr workspace
 */
export interface StructurizrView {
  /** View key (e.g., "SystemContext", "Container") */
  key: string;
  
  /** Human-readable view name (e.g., "System Context", "Container") */
  name: string;
  
  /** Path to the generated SVG file */
  svgPath: string;
}

// ============================================================================
// Structurizr Pipeline Renderer Implementation
// ============================================================================

/**
 * Renderer for Structurizr DSL files using the automated pipeline
 * Uses render-dsl-to-svg.cmd script for high-quality SVG output
 */
export class StructurizrPipelineRenderer {
  /** Path to the render-dsl-to-svg.cmd script */
  private scriptPath: string;
  
  /** Workspace root directory */
  private workspaceRoot: string;

  /**
   * Create a new Structurizr pipeline renderer
   * @param workspaceRoot - Workspace root directory
   * @param extensionPath - Extension installation directory
   */
  constructor(workspaceRoot: string, extensionPath: string) {
    this.workspaceRoot = workspaceRoot;
    // Script is located in the extension's assets/scripts directory
    this.scriptPath = path.join(extensionPath, "assets", "scripts", "render-dsl-to-svg.cmd");
  }

  /**
   * Check if the rendering pipeline is available
   * @returns Promise<boolean> - true if pipeline is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    // Check if script exists
    if (!fs.existsSync(this.scriptPath)) {
      console.log(`[StructurizrPipelineRenderer] Script not found at: ${this.scriptPath}`);
      return false;
    }

    // Check if Docker is available by running docker ps
    try {
      await execFile("docker", ["ps"], { timeout: 5000 });
      console.log(`[StructurizrPipelineRenderer] Docker is available`);
      return true;
    } catch (error) {
      console.log(`[StructurizrPipelineRenderer] Docker is not available: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Render a Structurizr DSL file to SVG using the pipeline
   * 
   * @param dslPath - Path to the .dsl workspace file
   * @param outputDir - Directory where SVG files will be saved (not used, pipeline uses configured output)
   * @returns Promise<PipelineRenderResult> - Result containing views and errors
   * @throws Error if pipeline is not available or if rendering fails critically
   */
  async render(dslPath: string, outputDir: string): Promise<PipelineRenderResult> {
    // Validate that pipeline is available
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "Structurizr rendering pipeline not available. Please ensure:\n" +
        "1. Docker Desktop is installed and running\n" +
        "2. render-dsl-to-svg.cmd script exists in workspace root\n" +
        "3. docker-compose.structurizr.yml is configured"
      );
    }

    // Validate that the DSL file exists
    if (!fs.existsSync(dslPath)) {
      throw new Error(`DSL file not found: ${dslPath}`);
    }

    // Extract filename from path
    const fileName = path.basename(dslPath);

    // Execute the rendering pipeline script for this specific file
    let stdout: string;
    let stderr: string;
    
    console.log(`[StructurizrPipelineRenderer] Executing script: ${this.scriptPath}`);
    console.log(`[StructurizrPipelineRenderer] With args: [${fileName}]`);
    console.log(`[StructurizrPipelineRenderer] CWD: ${this.workspaceRoot}`);
    
    try {
      // On Windows, we need to execute .cmd files through cmd.exe
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'cmd.exe' : this.scriptPath;
      const args = isWindows ? ['/c', this.scriptPath, fileName] : [fileName];
      
      console.log(`[StructurizrPipelineRenderer] Actual command: ${command}`);
      console.log(`[StructurizrPipelineRenderer] Actual args:`, args);
      
      const result = await execFile(
        command,
        args,
        {
          cwd: this.workspaceRoot,
          timeout: 60000, // 60 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );
      
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      console.log(`[StructurizrPipelineRenderer] Script execution error:`, error.message);
      console.log(`[StructurizrPipelineRenderer] Error code:`, error.code);
      
      // If the script exits with non-zero code, it may still have useful output
      stdout = error.stdout || "";
      stderr = error.stderr || "";
      
      // Check if it's a timeout or other critical error
      if (error.killed || error.signal) {
        throw new Error(
          `Rendering pipeline timed out or was killed: ${error.message}`
        );
      }
      
      // For non-zero exit codes, we'll parse the output to extract errors
      // The script may have processed some files successfully
    }

    // Debug logging
    console.log(`[StructurizrPipelineRenderer] Script executed for: ${fileName}`);
    console.log(`[StructurizrPipelineRenderer] Workspace root: ${this.workspaceRoot}`);
    console.log(`[StructurizrPipelineRenderer] Script stdout length: ${stdout.length}`);
    console.log(`[StructurizrPipelineRenderer] Script stderr length: ${stderr.length}`);
    
    // Parse the output to extract results
    const result = this.parseScriptOutput(stdout, stderr, dslPath, outputDir);
    
    console.log(`[StructurizrPipelineRenderer] Parsed views count: ${result.views.length}`);
    console.log(`[StructurizrPipelineRenderer] Parsed errors count: ${result.errors.length}`);
    if (result.views.length > 0) {
      console.log(`[StructurizrPipelineRenderer] Views:`, result.views.map(v => v.key));
    }

    return result;
  }

  /**
   * Render all Structurizr DSL files in the source directory
   * 
   * @param sourceDir - Source directory containing DSL files
   * @param outputDir - Output directory for SVG files
   * @returns Promise<PipelineRenderResult> - Result containing all views and errors
   */
  async renderAll(sourceDir: string, outputDir: string): Promise<PipelineRenderResult> {
    // Validate that pipeline is available
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "Structurizr rendering pipeline not available. Please ensure:\n" +
        "1. Docker Desktop is installed and running\n" +
        "2. render-dsl-to-svg.cmd script exists in workspace root\n" +
        "3. docker-compose.structurizr.yml is configured"
      );
    }

    // Execute the rendering pipeline script for all files
    let stdout: string;
    let stderr: string;
    
    try {
      // On Windows, we need to execute .cmd files through cmd.exe
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'cmd.exe' : this.scriptPath;
      const args = isWindows ? ['/c', this.scriptPath, '--all'] : ['--all'];
      
      const result = await execFile(
        command,
        args,
        {
          cwd: this.workspaceRoot,
          timeout: 120000, // 120 second timeout for multiple files
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );
      
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      // If the script exits with non-zero code, it may still have useful output
      stdout = error.stdout || "";
      stderr = error.stderr || "";
      
      // Check if it's a timeout or other critical error
      if (error.killed || error.signal) {
        throw new Error(
          `Rendering pipeline timed out or was killed: ${error.message}`
        );
      }
      
      // For non-zero exit codes, we'll parse the output to extract errors
    }

    // Parse the output to extract results
    const result = this.parseScriptOutput(stdout, stderr, sourceDir, outputDir);

    return result;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Parse render-dsl-to-svg.cmd script output to extract results
   * 
   * The script outputs:
   * - Progress messages for each file
   * - Success/failure status for each file
   * - Summary with counts and execution time
   * - List of generated SVG files
   * 
   * @param stdout - Standard output from script
   * @param stderr - Standard error from script
   * @param sourcePath - Source DSL file or directory path
   * @param outputDir - Output directory where SVG files are saved
   * @returns PipelineRenderResult with views and errors
   */
  private parseScriptOutput(
    stdout: string,
    stderr: string,
    sourcePath: string,
    outputDir: string
  ): PipelineRenderResult {
    const views: StructurizrView[] = [];
    const errors: string[] = [];
    let executionTime: string | undefined;

    console.log(`[StructurizrPipelineRenderer] Parsing script output...`);
    console.log(`[StructurizrPipelineRenderer] stdout preview:`, stdout.substring(0, 500));

    // Parse stdout for generated files and errors
    const lines = stdout.split("\n");
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Extract generated SVG files from summary
      // Format: "  - filename.svg"
      if (trimmedLine.startsWith("- ") && trimmedLine.endsWith(".svg")) {
        console.log(`[StructurizrPipelineRenderer] Found SVG line: "${trimmedLine}"`);
        const fileName = trimmedLine.substring(2).trim();
        const baseName = path.basename(fileName, ".svg");
        
        // Use the script's hardcoded output directory
        const scriptOutputDir = path.join(this.workspaceRoot, "docs", "03_architecture", "diagrams", "out");
        
        views.push({
          key: baseName,
          name: this.formatViewName(baseName),
          svgPath: path.join(scriptOutputDir, fileName),
        });
      }
      
      // Extract errors
      // Format: "[ERROR] Stage: filename"
      if (trimmedLine.includes("[ERROR]")) {
        errors.push(trimmedLine);
      }
      
      // Extract execution time
      // Format: "Execution time: 8.450s"
      const timeMatch = trimmedLine.match(/Execution time:\s*(.+)/i);
      if (timeMatch) {
        executionTime = timeMatch[1];
      }
    }

    // Parse stderr for additional errors
    if (stderr && stderr.trim() !== "") {
      const stderrLines = stderr.split("\n").filter(line => line.trim() !== "");
      for (const line of stderrLines) {
        // Skip Docker warnings, info messages, and benign output
        if (
          line.includes("level=warning") ||
          line.includes("level=info") ||
          line.includes("obsolete") ||
          line.includes("time=") ||  // Docker timestamp lines
          line.trim().length === 0 ||  // Empty lines
          /^\d+$/.test(line.trim()) ||  // Pure numbers
          /^[\d:.,\s]+$/.test(line.trim())  // Time/date formats
        ) {
          continue;
        }
        errors.push(line.trim());
      }
    }

    // If no views were found but there are no errors, scan output directory
    // Note: The script uses a hardcoded output directory (docs/03_architecture/diagrams/out)
    // so we need to scan that directory, not the outputDir parameter
    if (views.length === 0 && errors.length === 0) {
      console.log(`[StructurizrPipelineRenderer] No views found in output, scanning directory...`);
      try {
        // Use the script's hardcoded output directory
        const scriptOutputDir = path.join(this.workspaceRoot, "docs", "03_architecture", "diagrams", "out");
        console.log(`[StructurizrPipelineRenderer] Scanning directory: ${scriptOutputDir}`);
        const scannedViews = this.scanOutputDirectory(scriptOutputDir);
        console.log(`[StructurizrPipelineRenderer] Found ${scannedViews.length} views in directory scan`);
        views.push(...scannedViews);
      } catch (error) {
        console.log(`[StructurizrPipelineRenderer] Directory scan failed:`, error);
        errors.push(
          `Failed to scan output directory: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { views, errors, executionTime };
  }

  /**
   * Scan output directory for generated SVG files
   * This is a fallback method when script output parsing fails
   * 
   * @param outputDir - Output directory to scan
   * @returns Array of StructurizrView objects
   */
  private scanOutputDirectory(outputDir: string): StructurizrView[] {
    const views: StructurizrView[] = [];

    // Check if output directory exists
    if (!fs.existsSync(outputDir)) {
      return views;
    }

    // Read directory contents
    const files = fs.readdirSync(outputDir);

    // Look for SVG files
    for (const file of files) {
      if (file.endsWith(".svg")) {
        const baseName = path.basename(file, ".svg");
        const svgPath = path.join(outputDir, file);

        // Verify it's actually a file (not a directory)
        const stats = fs.statSync(svgPath);
        if (stats.isFile()) {
          views.push({
            key: baseName,
            name: this.formatViewName(baseName),
            svgPath: svgPath,
          });
        }
      }
    }

    return views;
  }

  /**
   * Format a view key into a human-readable name
   * Converts camelCase, PascalCase, or underscore-separated to space-separated words
   * 
   * Examples:
   * - "c4_context" -> "C4 Context"
   * - "SystemContext" -> "System Context"
   * - "Container" -> "Container"
   * 
   * @param viewKey - View key to format
   * @returns Formatted view name
   */
  private formatViewName(viewKey: string): string {
    // Replace underscores with spaces
    let formatted = viewKey.replace(/_/g, " ");
    
    // Insert space before capital letters (except the first one)
    formatted = formatted.replace(/([A-Z])/g, " $1").trim();
    
    // Capitalize first letter of each word
    formatted = formatted
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    
    return formatted;
  }
}
