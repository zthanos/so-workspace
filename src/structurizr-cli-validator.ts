/**
 * Structurizr CLI Validator
 * 
 * Validates Structurizr DSL files using the Structurizr CLI running in Docker.
 * This validator works with the free Structurizr Lite + CLI setup.
 * 
 * Features:
 * - Validates DSL files using docker exec to run structurizr.sh
 * - Parses CLI output for errors and warnings
 * - Works with both local CLI and Docker container
 * - No commercial license required
 */

import * as fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Validation result for a single DSL file
 */
export interface ValidationResult {
  /** Path to the validated file */
  filePath: string;
  
  /** Whether the file is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: ValidationError[];
  
  /** List of validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error with location information
 */
export interface ValidationError {
  /** Line number (0 if not available) */
  line: number;
  
  /** Column number (optional) */
  column?: number;
  
  /** Error message */
  message: string;
  
  /** Error severity */
  severity: "error";
}

/**
 * Validation warning with location information
 */
export interface ValidationWarning {
  /** Line number (0 if not available) */
  line: number;
  
  /** Warning message */
  message: string;
}

// ============================================================================
// CLI Validator Configuration
// ============================================================================

/**
 * Configuration for CLI-based validation
 */
export interface CliValidatorConfig {
  /** Docker container name (if using Docker) */
  containerName?: string;
  
  /** Path to structurizr.sh script (if using local CLI) */
  cliPath?: string;
  
  /** Workspace root path for mapping file paths */
  workspaceRoot?: string;
}

// ============================================================================
// Structurizr CLI Validator
// ============================================================================

/**
 * Validates Structurizr DSL files using the CLI
 */
export class StructurizrCliValidator {
  private containerName: string;
  private cliPath: string;
  private workspaceRoot: string;

  constructor(config: CliValidatorConfig = {}) {
    this.containerName = config.containerName || "structurizr-cli";
    this.cliPath = config.cliPath || "/usr/local/structurizr-cli/structurizr.sh";
    this.workspaceRoot = config.workspaceRoot || "";
  }

  /**
   * Validate a single Structurizr DSL file
   * 
   * @param dslPath - Path to the .dsl file to validate
   * @returns Promise<ValidationResult> - Validation result with errors and warnings
   */
  async validate(dslPath: string): Promise<ValidationResult> {
    // Check if file exists
    try {
      await fs.promises.access(dslPath, fs.constants.R_OK);
    } catch (error) {
      return {
        filePath: dslPath,
        valid: false,
        errors: [
          {
            line: 0,
            message: `File not found or not readable: ${dslPath}`,
            severity: "error",
          },
        ],
        warnings: [],
      };
    }

    // Convert absolute path to Docker workspace path
    const dockerPath = this.convertToDockerPath(dslPath);

    // Run validation command
    try {
      const command = `docker exec ${this.containerName} ${this.cliPath} validate -w ${dockerPath}`;
      const { stdout, stderr } = await execAsync(command);

      // Parse output for errors and warnings
      return this.parseCliOutput(dslPath, stdout, stderr);
    } catch (error: any) {
      // CLI returns non-zero exit code on validation errors
      const stdout = error.stdout || "";
      const stderr = error.stderr || "";
      
      // Check if it's a Docker/CLI error or validation error
      if (stderr.includes("unable to start container") || stderr.includes("No such container")) {
        return {
          filePath: dslPath,
          valid: false,
          errors: [
            {
              line: 0,
              message: `Structurizr CLI container not running. Start it with: docker-compose -f docker-compose.structurizr.yml up -d`,
              severity: "error",
            },
          ],
          warnings: [],
        };
      }

      // Parse validation errors from output
      return this.parseCliOutput(dslPath, stdout, stderr);
    }
  }

  /**
   * Validate multiple Structurizr DSL files
   * 
   * @param dslPaths - Array of paths to .dsl files to validate
   * @returns Promise<ValidationResult[]> - Array of validation results
   */
  async validateAll(dslPaths: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const dslPath of dslPaths) {
      const result = await this.validate(dslPath);
      results.push(result);
    }

    return results;
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
    }

    // Fallback: extract filename and assume it's in /workspace/src
    const filename = absolutePath.split(/[/\\]/).pop() || "";
    return `/workspace/src/${filename}`;
  }

  /**
   * Parse CLI output for errors and warnings
   * 
   * @param dslPath - Path to the DSL file
   * @param stdout - Standard output from CLI
   * @param stderr - Standard error from CLI
   * @returns ValidationResult
   */
  private parseCliOutput(
    dslPath: string,
    stdout: string,
    stderr: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Combine stdout and stderr for parsing
    const output = stdout + "\n" + stderr;

    // Parse error patterns from CLI output
    // Example: "Line 10: Unexpected token"
    const errorPattern = /(?:Line|line)\s+(\d+)[:\s]+(.+)/gi;
    let match;

    while ((match = errorPattern.exec(output)) !== null) {
      const line = parseInt(match[1], 10);
      const message = match[2].trim();
      
      errors.push({
        line,
        message,
        severity: "error",
      });
    }

    // If no specific errors found but stderr has content, add generic error
    if (errors.length === 0 && stderr.trim().length > 0) {
      // Filter out Docker/system errors
      if (!stderr.includes("unable to start container") && 
          !stderr.includes("No such container")) {
        errors.push({
          line: 0,
          message: stderr.trim(),
          severity: "error",
        });
      }
    }

    // If exit was successful (no errors in output), mark as valid
    const valid = errors.length === 0;

    return {
      filePath: dslPath,
      valid,
      errors,
      warnings,
    };
  }
}
