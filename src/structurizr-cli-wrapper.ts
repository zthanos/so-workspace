/**
 * Structurizr CLI Wrapper
 * 
 * Provides abstraction over Structurizr CLI execution for rendering DSL files.
 * The Structurizr CLI is a command-line tool for exporting diagrams from
 * Structurizr DSL workspace files to various formats (SVG, PNG, etc.).
 * 
 * Requirements:
 * - Structurizr CLI must be installed and available in PATH
 * - Java Runtime Environment (JRE 8+) must be installed
 * 
 * CLI Installation:
 * - Download from: https://github.com/structurizr/cli
 * - Add to PATH or configure custom path in settings
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Result from CLI command execution
 */
export interface CLIResult {
  /** Whether the command executed successfully (exit code 0) */
  success: boolean;
  
  /** Standard output from the CLI command */
  stdout: string;
  
  /** Standard error output from the CLI command */
  stderr: string;
  
  /** Process exit code */
  exitCode: number;
}

/**
 * Export format options for Structurizr CLI
 */
export type ExportFormat = 'svg' | 'png';

// ============================================================================
// Structurizr CLI Wrapper Implementation
// ============================================================================

/**
 * Wrapper for Structurizr CLI operations
 * Provides methods to check availability, get version, and export diagrams
 */
export class StructurizrCLI {
  private cliPath: string;
  private containerName?: string;
  private workspaceRoot?: string;

  /**
   * Create a new Structurizr CLI wrapper
   * @param cliPath - Path to Structurizr CLI executable (defaults to 'structurizr-cli' in PATH)
   * @param containerName - Docker container name (if using Docker)
   * @param workspaceRoot - Workspace root path for Docker path mapping
   */
  constructor(cliPath?: string, containerName?: string, workspaceRoot?: string) {
    this.cliPath = cliPath || 'structurizr-cli';
    this.containerName = containerName;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Check if Structurizr CLI is available and executable
   * Attempts to execute the CLI with version command
   * 
   * @returns Promise<boolean> - true if CLI is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to execute CLI with version command
      const result = await this.executeCommand('version');
      return result.success;
    } catch (error) {
      // CLI not found or not executable
      return false;
    }
  }

  /**
   * Get the version of the installed Structurizr CLI
   * 
   * @returns Promise<string> - Version string (e.g., "1.30.0")
   * @throws Error if CLI is not available or version cannot be determined
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.executeCommand('version');
      
      if (!result.success) {
        throw new Error(`Failed to get CLI version: ${result.stderr}`);
      }

      // Parse version from output
      // Expected format: "structurizr-cli: 1.30.0" or similar
      const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch && versionMatch[1]) {
        return versionMatch[1];
      }

      // If we can't parse the version, return the full output
      return result.stdout.trim();
    } catch (error) {
      throw new Error(
        `Failed to get Structurizr CLI version: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export diagrams from a Structurizr DSL workspace file
   * Executes: structurizr-cli export -workspace <dslPath> -format <format> -output <outputDir>
   * 
   * @param dslPath - Path to the .dsl workspace file
   * @param format - Export format ('svg' or 'png')
   * @param outputDir - Directory where exported files will be saved
   * @returns Promise<CLIResult> - Result of the export operation
   * @throws Error if dslPath does not exist or is not readable
   */
  async export(
    dslPath: string,
    format: ExportFormat,
    outputDir: string
  ): Promise<CLIResult> {
    // Validate that the DSL file exists
    try {
      await fs.promises.access(dslPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`DSL file not found or not readable: ${dslPath}`);
    }

    // Ensure output directory exists
    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Convert paths for Docker if needed
    let workspacePath = dslPath;
    let outputPath = outputDir;
    
    if (this.containerName && this.workspaceRoot) {
      workspacePath = this.convertToDockerPath(dslPath);
      outputPath = this.convertToDockerPath(outputDir);
    }

    // Build the export command
    // Format: structurizr-cli export -workspace <dslPath> -format <format> -output <outputDir>
    const args = [
      'export',
      '-workspace',
      `"${workspacePath}"`,
      '-format',
      format,
      '-output',
      `"${outputPath}"`
    ];

    try {
      const result = await this.executeCommand(args.join(' '));
      return result;
    } catch (error) {
      throw new Error(
        `Structurizr CLI export failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Convert absolute file path to Docker workspace path
   * 
   * @param absolutePath - Absolute file path on host
   * @returns Docker workspace path
   */
  private convertToDockerPath(absolutePath: string): string {
    // The docker-compose mounts ./docs/03_architecture/diagrams/src to /workspace/src
    // Extract the relative path from the workspace root
    
    if (this.workspaceRoot && absolutePath.startsWith(this.workspaceRoot)) {
      const relativePath = absolutePath.substring(this.workspaceRoot.length);
      // Convert Windows paths to Unix paths
      const unixPath = relativePath.replace(/\\/g, "/");
      
      // Map to Docker path
      // Assuming the structure: docs/03_architecture/diagrams/src -> /workspace/src
      if (unixPath.includes("/docs/03_architecture/diagrams/src/")) {
        return unixPath.replace(/.*\/docs\/03_architecture\/diagrams\/src\//, "/workspace/src/");
      }
      
      // For output directory
      if (unixPath.includes("/docs/03_architecture/diagrams/out/")) {
        return unixPath.replace(/.*\/docs\/03_architecture\/diagrams\/out\//, "/workspace/out/");
      }
    }

    // Fallback: extract filename and assume it's in /workspace/src
    const filename = absolutePath.split(/[/\\]/).pop() || "";
    return `/workspace/src/${filename}`;
  }

  /**
   * Execute a Structurizr CLI command
   * 
   * @param args - Command arguments as a string
   * @param isDockerCommand - Whether this is already a full docker command
   * @returns Promise<CLIResult> - Result of the command execution
   */
  private async executeCommand(args: string, isDockerCommand: boolean = false): Promise<CLIResult> {
    let command: string;
    
    if (isDockerCommand) {
      // Command is already formatted (for Docker)
      command = args;
    } else if (this.containerName) {
      // Use Docker exec
      command = `docker exec ${this.containerName} ${this.cliPath} ${args}`;
    } else {
      // Use local CLI
      command = `${this.cliPath} ${args}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      });

      return {
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      };
    } catch (error: any) {
      // exec throws an error for non-zero exit codes
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
      };
    }
  }
}
