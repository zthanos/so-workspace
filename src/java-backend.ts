/**
 * Java Backend Renderer
 * 
 * Implements diagram rendering using local Java-based tools:
 * - PlantUML JAR for PlantUML and Structurizr diagrams
 * - Kroki HTTP API (primary) / Bundled Mermaid webview (fallback) for Mermaid diagrams
 * 
 * This backend enables offline diagram rendering without requiring
 * internet connectivity or cloud services.
 */

import * as vscode from "vscode";
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
import { renderMermaidViaKroki, renderMermaidViaWebview } from "./mermaid-webview-renderer";

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

  /** Java executable path (defaults to 'java' in PATH) */
  javaPath?: string;

  /** Maximum concurrent rendering operations */
  maxConcurrent?: number;

  /** VS Code extension context for creating hidden webviews */
  extensionContext?: vscode.ExtensionContext;

  /** Kroki service endpoint URL */
  krokiEndpoint?: string;
}

// ============================================================================
// Java Backend Implementation
// ============================================================================

/**
 * Java-based rendering backend
 * Uses PlantUML JAR for PlantUML/Structurizr and Kroki/webview for Mermaid
 */
export class JavaRenderBackend implements RenderBackend {
  readonly name = "Java";

  private plantUmlJarPath: string;
  private javaPath: string;
  private extensionContext?: vscode.ExtensionContext;
  private krokiEndpoint?: string;
  private mermaidValidator: MermaidValidator;

  constructor(config: JavaBackendConfig) {
    this.plantUmlJarPath = config.plantUmlJarPath;
    this.javaPath = config.javaPath || "java";
    this.extensionContext = config.extensionContext;
    this.krokiEndpoint = config.krokiEndpoint;
    this.mermaidValidator = new MermaidValidator();
  }

  /**
   * Check if backend is available and ready to use
   * Validates Java installation and PlantUML JAR availability
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

    // Mermaid is supported when extensionContext is available (bundled mermaid is always shipped with the extension)
    if (this.extensionContext) {
      supportedTypes.push("mermaid");
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
  // Private Helper Methods - Mermaid Rendering (Kroki-primary / webview-fallback)
  // ==========================================================================

  /**
   * Render Mermaid diagram using Kroki HTTP API (primary) with bundled
   * mermaid.js webview fallback.
   */
  private async renderMermaid(content: string): Promise<RenderOutput> {
    const krokiEndpoint = this.krokiEndpoint || "https://kroki.io";

    // Try Kroki first (primary renderer)
    try {
      const svg = await renderMermaidViaKroki(content, krokiEndpoint);
      return { content: svg, format: "svg", extension: ".svg" };
    } catch (krokiError) {
      // Kroki failed — fall back to bundled mermaid webview
      console.warn(
        `[JavaRenderBackend] Kroki unavailable (${krokiError instanceof Error ? krokiError.message : String(krokiError)}), falling back to bundled mermaid.js`
      );
    }

    // Fallback: bundled mermaid in a hidden webview
    if (!this.extensionContext) {
      throw new Error(
        "Mermaid rendering failed: Kroki is unavailable and no extensionContext provided for webview fallback"
      );
    }

    const svg = await renderMermaidViaWebview(content, this.extensionContext);
    return { content: svg, format: "svg", extension: ".svg" };
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
