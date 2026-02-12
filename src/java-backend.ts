/**
 * Java Backend Renderer
 * 
 * Implements diagram rendering using local Java-based tools:
 * - PlantUML JAR for PlantUML and Structurizr diagrams
 * - Mermaid CLI (mmdc) for Mermaid diagrams
 * 
 * This backend enables offline diagram rendering without requiring
 * internet connectivity or cloud services.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import {
  RenderBackend,
  BackendAvailability,
  RenderOutput,
  DiagramType,
} from "./backend-strategy";
import { DiagramFile } from "./diagram_renderer_v2";
import { MermaidValidator } from "./mermaid-validator";

const execAsync = promisify(exec);

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Configuration for Java backend renderer
 */
export interface JavaBackendConfig {
  /** Path to PlantUML JAR file (relative to workspace root or absolute) */
  plantUmlJarPath: string;

  /** Path to Mermaid CLI executable (mmdc) */
  mermaidCliPath: string;

  /** Java executable path (defaults to 'java' in PATH) */
  javaPath?: string;

  /** Maximum concurrent rendering operations */
  maxConcurrent?: number;
}

// ============================================================================
// Java Backend Implementation
// ============================================================================

/**
 * Java-based rendering backend
 * Uses PlantUML JAR for PlantUML/Structurizr and Mermaid CLI for Mermaid
 */
export class JavaRenderBackend implements RenderBackend {
  readonly name = "Java";

  private plantUmlJarPath: string;
  private mermaidCliPath: string;
  private javaPath: string;
  private mermaidValidator: MermaidValidator;

  constructor(config: JavaBackendConfig) {
    this.plantUmlJarPath = config.plantUmlJarPath;
    this.mermaidCliPath = config.mermaidCliPath;
    this.javaPath = config.javaPath || "java";
    this.mermaidValidator = new MermaidValidator();
  }

  /**
   * Check if backend is available and ready to use
   * Validates Java installation, PlantUML JAR, and Mermaid CLI
   */
  async isAvailable(): Promise<BackendAvailability> {
    const supportedTypes: DiagramType[] = [];
    const errors: string[] = [];

    // Check Java availability
    const javaAvailable = await this.checkJavaAvailable();
    if (!javaAvailable) {
      errors.push("Java is not installed or not in PATH");
    }

    // Check PlantUML JAR availability
    const plantUmlAvailable = await this.checkPlantUmlJarAvailable();
    if (!plantUmlAvailable) {
      errors.push(`PlantUML JAR not found at: ${this.plantUmlJarPath}`);
    }

    // If both Java and PlantUML JAR are available, support PlantUML and Structurizr
    if (javaAvailable && plantUmlAvailable) {
      supportedTypes.push("plantuml", "structurizr");
    }

    // Check Mermaid CLI availability
    const mermaidAvailable = await this.checkMermaidCliAvailable();
    if (mermaidAvailable) {
      supportedTypes.push("mermaid");
    } else {
      errors.push("Mermaid CLI (mmdc) is not installed or not in PATH");
    }

    // Backend is available if at least one diagram type is supported
    const available = supportedTypes.length > 0;

    return {
      available,
      message: available ? undefined : errors.join("; "),
      supportedTypes,
    };
  }

  /**
   * Render a diagram file to SVG/PNG
   */
  async render(file: DiagramFile, content: string): Promise<RenderOutput> {
    switch (file.type) {
      case "mermaid":
        return this.renderMermaid(content);
      case "plantuml":
      case "structurizr":
        return this.renderPlantUML(content);
      default:
        throw new Error(`Unsupported diagram type: ${file.type}`);
    }
  }

  /**
   * Cleanup resources (no-op for Java backend)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for Java backend
  }

  // ==========================================================================
  // Private Helper Methods - Availability Checks
  // ==========================================================================

  /**
   * Check if Java is installed and available
   */
  private async checkJavaAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.javaPath} -version`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if PlantUML JAR file exists
   */
  private async checkPlantUmlJarAvailable(): Promise<boolean> {
    try {
      await fs.promises.access(this.plantUmlJarPath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Mermaid CLI is installed and available
   */
  private async checkMermaidCliAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.mermaidCliPath} --version`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==========================================================================
  // Private Helper Methods - Mermaid Rendering
  // ==========================================================================

  /**
   * Render Mermaid diagram using Mermaid CLI
   * Executes: mmdc -i input.mmd -o output.svg
   */
  private async renderMermaid(content: string): Promise<RenderOutput> {
    // Validate Mermaid diagram before rendering
    const validationResult = this.mermaidValidator.validate('mermaid-diagram.mmd', content);
    
    if (!validationResult.valid) {
      throw new Error(
        `Mermaid diagram validation failed:\n${validationResult.errors.join('\n')}`
      );
    }

    // Create temporary files for input and output
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}.mmd`);
    const outputFile = path.join(tempDir, `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}.svg`);

    try {
      // Write content to temporary input file
      await fs.promises.writeFile(inputFile, content, "utf-8");

      // Execute Mermaid CLI
      const command = `${this.mermaidCliPath} -i "${inputFile}" -o "${outputFile}"`;
      await execAsync(command);

      // Read rendered SVG output
      const svg = await fs.promises.readFile(outputFile, "utf-8");

      return {
        content: svg,
        format: "svg",
        extension: ".svg",
      };
    } catch (error) {
      throw new Error(
        `Mermaid CLI rendering failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      // Cleanup temporary files
      await this.cleanupTempFile(inputFile);
      await this.cleanupTempFile(outputFile);
    }
  }

  // ==========================================================================
  // Private Helper Methods - PlantUML Rendering
  // ==========================================================================

  /**
   * Render PlantUML diagram using PlantUML JAR
   * Executes: java -jar plantuml.jar -tsvg input.puml
   * Supports both PlantUML and Structurizr diagrams
   */
  private async renderPlantUML(content: string): Promise<RenderOutput> {
    // Create temporary files for input and output
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `plantuml-${Date.now()}-${Math.random().toString(36).substring(7)}.puml`);

    try {
      // Write content to temporary input file
      await fs.promises.writeFile(inputFile, content, "utf-8");

      // Execute PlantUML JAR to generate SVG
      const command = `${this.javaPath} -jar "${this.plantUmlJarPath}" -tsvg "${inputFile}"`;
      await execAsync(command);

      // PlantUML creates output file with .svg extension in same directory
      const outputFile = inputFile.replace(/\.puml$/, ".svg");

      // Read rendered SVG output
      const svg = await fs.promises.readFile(outputFile, "utf-8");

      // Cleanup output file
      await this.cleanupTempFile(outputFile);

      return {
        content: svg,
        format: "svg",
        extension: ".svg",
      };
    } catch (error) {
      throw new Error(
        `PlantUML JAR rendering failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      // Cleanup temporary input file
      await this.cleanupTempFile(inputFile);
    }
  }

  // ==========================================================================
  // Private Helper Methods - Utilities
  // ==========================================================================

  /**
   * Cleanup temporary file (ignore errors)
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
