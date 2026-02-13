import { MermaidValidator } from './mermaid-validator';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Render output result
 */
export interface RenderOutput {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Diagram file information
 */
export interface DiagramFile {
  path: string;
  outputPath: string;
  type: 'mermaid';
}

/**
 * Renders Mermaid diagrams locally using @mermaid-js/mermaid-cli
 */
export class MermaidRenderBackend {
  private validator: MermaidValidator;

  constructor() {
    this.validator = new MermaidValidator();
  }

  /**
   * Renders a Mermaid diagram file to PNG or SVG
   * @param file - Diagram file information
   * @param content - Diagram content
   * @returns Render output result
   */
  async render(file: DiagramFile, content: string): Promise<RenderOutput> {
    try {
      // Validate diagram before rendering
      const validationResult = this.validator.validate(file.path, content);
      
      if (!validationResult.valid) {
        return {
          success: false,
          outputPath: '',
          error: `Validation failed:\n${validationResult.errors.join('\n')}`
        };
      }

      // Render using local Mermaid package
      const outputPath = await this.renderLocally(content, file.outputPath);

      return {
        success: true,
        outputPath
      };
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Renders diagram content using local Mermaid CLI
   * @param content - Diagram content
   * @param outputPath - Desired output file path
   * @returns Path to rendered output file
   */
  private async renderLocally(content: string, outputPath: string): Promise<string> {
    // Create temporary input file
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `mermaid-${Date.now()}.mmd`);
    
    try {
      // Write content to temp file
      await fs.writeFile(tempInputPath, content, 'utf-8');

      // Determine output format from extension
      const outputExt = path.extname(outputPath).toLowerCase();
      const format = outputExt === '.svg' ? 'svg' : 'png';

      // Run mmdc command
      // mmdc -i input.mmd -o output.png -b transparent
      const command = `npx -p @mermaid-js/mermaid-cli mmdc -i "${tempInputPath}" -o "${outputPath}" -b transparent`;
      
      await execAsync(command);

      // Verify output file was created
      await fs.access(outputPath);

      return outputPath;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempInputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Renders multiple diagram files
   * @param files - Array of diagram files with content
   * @returns Array of render results
   */
  async renderMultiple(
    files: Array<{ file: DiagramFile; content: string }>
  ): Promise<RenderOutput[]> {
    const results: RenderOutput[] = [];

    for (const { file, content } of files) {
      const result = await this.render(file, content);
      results.push(result);
    }

    return results;
  }

  /**
   * Gets a summary of render results
   * @param results - Array of render results
   * @returns Summary object
   */
  getSummary(results: RenderOutput[]): {
    total: number;
    successful: number;
    failed: number;
  } {
    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }
}
