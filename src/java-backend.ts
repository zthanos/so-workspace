/**
 * Diagram Rendering Backend
 *
 * Uses a local Kroki endpoint for PlantUML and Mermaid rendering, with a
 * bundled Mermaid webview fallback when Kroki is unavailable.
 */

import * as vscode from "vscode";
import {
  RenderBackend,
  BackendAvailability,
  RenderOutput,
  DiagramType,
} from "./backend-strategy";
import { DiagramFile } from "./diagram_renderer_v2";
import { MermaidValidator } from "./mermaid-validator";
import { renderMermaidViaKroki, renderMermaidViaWebview } from "./mermaid-webview-renderer";

/**
 * Configuration for the rendering backend.
 *
 * `plantUmlJarPath` and `javaPath` are kept for compatibility with existing
 * configuration, but Kroki is the active renderer.
 */
export interface JavaBackendConfig {
  plantUmlJarPath: string;
  javaPath?: string;
  maxConcurrent?: number;
  extensionContext?: vscode.ExtensionContext;
  krokiEndpoint?: string;
}

export class JavaRenderBackend implements RenderBackend {
  readonly name = "Java";

  private extensionContext?: vscode.ExtensionContext;
  private krokiEndpoint?: string;
  private mermaidValidator: MermaidValidator;

  constructor(config: JavaBackendConfig) {
    this.extensionContext = config.extensionContext;
    this.krokiEndpoint = config.krokiEndpoint;
    this.mermaidValidator = new MermaidValidator();
  }

  async isAvailable(): Promise<BackendAvailability> {
    const supportedTypes: DiagramType[] = [];
    const errors: string[] = [];

    const krokiAvailable = await this.checkKrokiAvailable();
    if (krokiAvailable) {
      supportedTypes.push("plantuml", "mermaid");
    } else {
      errors.push(`Kroki endpoint is not reachable: ${this.krokiEndpoint || "http://localhost:8000"}`);
    }

    if (!krokiAvailable && this.extensionContext) {
      supportedTypes.push("mermaid");
    }

    const available = supportedTypes.length > 0;

    return {
      available,
      message: available ? undefined : errors.join("; "),
      supportedTypes,
    };
  }

  async render(file: DiagramFile, content: string): Promise<RenderOutput> {
    switch (file.type) {
      case "mermaid":
        return this.renderMermaid(content);
      case "plantuml":
        return this.renderPlantUML(content);
      case "structurizr":
        throw new Error("Structurizr DSL must be rendered by the Structurizr Kroki renderer, not the Java backend.");
      default:
        throw new Error(`Unsupported diagram type: ${file.type}`);
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed.
  }

  private async renderMermaid(content: string): Promise<RenderOutput> {
    const krokiEndpoint = this.krokiEndpoint || "http://localhost:8000";

    try {
      const validation = this.mermaidValidator.validate("inline.mmd", content);
      if (!validation.valid) {
        throw new Error(validation.errors.join("; "));
      }

      const svg = await renderMermaidViaKroki(content, krokiEndpoint, "mermaid");
      return { content: svg, format: "svg", extension: ".svg" };
    } catch (krokiError) {
      console.warn(
        `[JavaRenderBackend] Kroki unavailable (${krokiError instanceof Error ? krokiError.message : String(krokiError)}), falling back to bundled mermaid.js`
      );
    }

    if (!this.extensionContext) {
      throw new Error(
        "Mermaid rendering failed: Kroki is unavailable and no extensionContext provided for webview fallback"
      );
    }

    const svg = await renderMermaidViaWebview(content, this.extensionContext);
    return { content: svg, format: "svg", extension: ".svg" };
  }

  private async renderPlantUML(content: string): Promise<RenderOutput> {
    try {
      const krokiEndpoint = this.krokiEndpoint || "http://localhost:8000";
      const svg = await renderMermaidViaKroki(content, krokiEndpoint, "plantuml");
      return {
        content: svg,
        format: "svg",
        extension: ".svg",
      };
    } catch (error) {
      throw new Error(
        `PlantUML Kroki rendering failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async checkKrokiAvailable(): Promise<boolean> {
    const krokiEndpoint = (this.krokiEndpoint || "http://localhost:8000").replace(/\/$/, "");
    try {
      const response = await Promise.race([
        fetch(`${krokiEndpoint}/health`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Kroki health check timed out")), 5000)
        ),
      ]);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
