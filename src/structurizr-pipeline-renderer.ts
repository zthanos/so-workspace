/**
 * Structurizr DSL Renderer Adapter
 *
 * Keeps the existing orchestrator integration surface while rendering `.dsl`
 * files through a dedicated Structurizr CLI runtime. This is intended to run
 * against a configured CLI binary or containerized Structurizr image, without
 * depending on Java on the host machine.
 */

import * as fs from "fs";
import * as path from "path";
import { StructurizrRenderer } from "./structurizr-renderer";

export interface PipelineRenderResult {
  views: StructurizrView[];
  errors: string[];
  executionTime?: string;
}

export interface StructurizrView {
  key: string;
  name: string;
  svgPath: string;
}

export class StructurizrPipelineRenderer {
  private renderer: StructurizrRenderer;

  constructor(workspaceRoot: string, cliPath?: string, containerName?: string) {
    this.renderer = new StructurizrRenderer(cliPath, containerName, workspaceRoot);
  }

  async isAvailable(): Promise<boolean> {
    const available = await this.renderer.isAvailable();
    console.log(`[StructurizrPipelineRenderer] Structurizr CLI available: ${available}`);
    return available;
  }

  async render(dslPath: string, outputDir: string): Promise<PipelineRenderResult> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "Structurizr rendering is not available. Please ensure:\n" +
        "1. Structurizr CLI is installed or available in the configured container\n" +
        "2. The configured cli path/container name is correct\n" +
        "3. Docker is running if you use a containerized Structurizr CLI"
      );
    }

    if (!fs.existsSync(dslPath)) {
      throw new Error(`DSL file not found: ${dslPath}`);
    }

    const start = Date.now();
    const result = await this.renderer.render(dslPath, outputDir);
    return {
      views: result.views,
      errors: result.errors,
      executionTime: `${Date.now() - start}ms`,
    };
  }

  async renderAll(sourceDir: string, outputDir: string): Promise<PipelineRenderResult> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        "Structurizr rendering is not available. Please ensure Structurizr CLI is configured correctly."
      );
    }

    const start = Date.now();
    const views: StructurizrView[] = [];
    const errors: string[] = [];

    const dslFiles = (await fs.promises.readdir(sourceDir))
      .filter((name) => name.toLowerCase().endsWith(".dsl"))
      .map((name) => path.join(sourceDir, name));

    for (const dslFile of dslFiles) {
      try {
        const result = await this.renderer.render(dslFile, outputDir);
        views.push(...result.views);
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`${path.basename(dslFile)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      views,
      errors,
      executionTime: `${Date.now() - start}ms`,
    };
  }
}
