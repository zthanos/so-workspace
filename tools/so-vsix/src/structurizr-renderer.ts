/**
 * Structurizr DSL Renderer
 * 
 * Renders Structurizr DSL files to SVG using the Structurizr CLI.
 * The Structurizr CLI exports diagrams from DSL workspace files to various formats.
 * 
 * Requirements:
 * - Structurizr CLI must be installed and available in PATH
 * - Java Runtime Environment (JRE 8+) must be installed
 * 
 * Features:
 * - Renders .dsl files to SVG format
 * - Handles multiple views from a single .dsl file
 * - Parses CLI output to identify generated SVG files
 * - Provides detailed error reporting
 */

import * as fs from "fs";
import * as path from "path";
import { StructurizrCLI, CLIResult } from "./structurizr-cli-wrapper";

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Result from rendering a Structurizr DSL file
 * A single .dsl file can contain multiple views, each rendered to a separate SVG
 */
export interface StructurizrRenderResult {
  /** List of views that were successfully rendered */
  views: StructurizrView[];
  
  /** List of errors encountered during rendering */
  errors: string[];
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
// Structurizr Renderer Implementation
// ============================================================================

/**
 * Renderer for Structurizr DSL files
 * Uses Structurizr CLI to export diagrams to SVG format
 */
export class StructurizrRenderer {
  /** Structurizr CLI wrapper for executing commands */
  private cli: StructurizrCLI;

  /**
   * Create a new Structurizr renderer
   * @param cliPath - Optional custom path to Structurizr CLI executable
   */
  constructor(cliPath?: string) {
    this.cli = new StructurizrCLI(cliPath);
  }

  /**
   * Check if Structurizr CLI is available
   * @returns Promise<boolean> - true if CLI is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    return await this.cli.isAvailable();
  }

  /**
   * Render a Structurizr DSL file to SVG
   * Executes the CLI export command and parses the output to identify generated files
   * 
   * @param dslPath - Path to the .dsl workspace file
   * @param outputDir - Directory where SVG files will be saved
   * @returns Promise<StructurizrRenderResult> - Result containing views and errors
   * @throws Error if CLI is not available or if rendering fails critically
   */
  async render(dslPath: string, outputDir: string): Promise<StructurizrRenderResult> {
    // Validate that CLI is available
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "Structurizr CLI not found. To render .dsl files:\n" +
        "1. Download Structurizr CLI from: https://github.com/structurizr/cli\n" +
        "2. Ensure Java 8+ is installed\n" +
        "3. Add structurizr-cli to your PATH, or configure path in settings:\n" +
        '   "so-workspace.diagrams.structurizrCliPath": "/path/to/structurizr-cli"'
      );
    }

    // Validate that the DSL file exists
    if (!fs.existsSync(dslPath)) {
      throw new Error(`DSL file not found: ${dslPath}`);
    }

    // Execute CLI export command
    let cliResult: CLIResult;
    try {
      cliResult = await this.cli.export(dslPath, "svg", outputDir);
    } catch (error) {
      throw new Error(
        `Failed to execute Structurizr CLI: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check if CLI execution was successful
    if (!cliResult.success) {
      throw new Error(
        `Structurizr CLI export failed:\n${cliResult.stderr || cliResult.stdout || "Unknown error"}`
      );
    }

    // Parse CLI output to identify generated SVG files
    const result = this.parseCLIOutput(cliResult.stdout, cliResult.stderr, outputDir);

    // If no views were generated and there are no errors, something went wrong
    if (result.views.length === 0 && result.errors.length === 0) {
      result.errors.push(
        "No views were generated. The DSL file may not contain any view definitions."
      );
    }

    return result;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Parse Structurizr CLI output to identify generated SVG files
   * 
   * The CLI outputs information about exported diagrams in its stdout.
   * We need to extract the view keys and construct the SVG file paths.
   * 
   * Expected CLI output format (example):
   * "Exporting workspace to /path/to/output..."
   * "Exported view: SystemContext"
   * "Exported view: Container"
   * 
   * @param stdout - Standard output from CLI
   * @param stderr - Standard error from CLI
   * @param outputDir - Output directory where SVG files are saved
   * @returns StructurizrRenderResult with views and errors
   */
  private parseCLIOutput(
    stdout: string,
    stderr: string,
    outputDir: string
  ): StructurizrRenderResult {
    const views: StructurizrView[] = [];
    const errors: string[] = [];

    // Parse stderr for errors
    if (stderr && stderr.trim() !== "") {
      // Check if stderr contains actual errors (not just warnings)
      const stderrLines = stderr.split("\n").filter(line => line.trim() !== "");
      for (const line of stderrLines) {
        // Skip common non-error messages
        if (
          line.includes("WARNING") ||
          line.includes("INFO") ||
          line.includes("SLF4J")
        ) {
          continue;
        }
        errors.push(line.trim());
      }
    }

    // Parse stdout for exported views
    // Look for patterns like "Exported view: <ViewKey>" or similar
    const exportedViewPattern = /(?:Exported|Exporting|Created).*?(?:view|diagram)[:\s]+([A-Za-z0-9_-]+)/gi;
    const matches = stdout.matchAll(exportedViewPattern);

    for (const match of matches) {
      const viewKey = match[1];
      if (viewKey) {
        views.push({
          key: viewKey,
          name: this.formatViewName(viewKey),
          svgPath: path.join(outputDir, `structurizr-${viewKey}.svg`),
        });
      }
    }

    // Alternative approach: Scan the output directory for generated SVG files
    // This is more reliable if the CLI output format changes
    if (views.length === 0) {
      try {
        const generatedViews = this.scanOutputDirectory(outputDir);
        views.push(...generatedViews);
      } catch (error) {
        // If scanning fails, add it as an error but don't throw
        errors.push(
          `Failed to scan output directory: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { views, errors };
  }

  /**
   * Scan output directory for generated SVG files
   * This is a fallback method when CLI output parsing fails
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

    // Look for SVG files that match Structurizr naming pattern
    // Typical pattern: structurizr-<ViewKey>.svg or <WorkspaceName>-<ViewKey>.svg
    const svgPattern = /^(?:structurizr-)?(.+?)\.svg$/i;

    for (const file of files) {
      const match = file.match(svgPattern);
      if (match) {
        const viewKey = match[1];
        const svgPath = path.join(outputDir, file);

        // Verify it's actually a file (not a directory)
        const stats = fs.statSync(svgPath);
        if (stats.isFile()) {
          views.push({
            key: viewKey,
            name: this.formatViewName(viewKey),
            svgPath: svgPath,
          });
        }
      }
    }

    return views;
  }

  /**
   * Format a view key into a human-readable name
   * Converts camelCase or PascalCase to space-separated words
   * 
   * Examples:
   * - "SystemContext" -> "System Context"
   * - "Container" -> "Container"
   * - "ComponentView" -> "Component View"
   * 
   * @param viewKey - View key to format
   * @returns Formatted view name
   */
  private formatViewName(viewKey: string): string {
    // Insert space before capital letters (except the first one)
    const formatted = viewKey.replace(/([A-Z])/g, " $1").trim();
    
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
