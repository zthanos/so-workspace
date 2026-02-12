import * as vscode from 'vscode';
import { MermaidValidator } from './mermaid-validator';

/**
 * Repair result for a single Mermaid diagram file
 */
export interface MermaidRepairResult {
  filePath: string;
  repaired: boolean;
  inferredType: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  backupCreated: boolean;
  error: string | null;
}

/**
 * Repairs Mermaid diagram syntax issues
 */
export class MermaidSyntaxRepairer {
  /**
   * Infers the diagram type from content using heuristics
   * @param content - Diagram content
   * @returns Inferred type and confidence level
   */
  private inferDiagramType(content: string): { type: string; confidence: 'high' | 'medium' | 'low' } | null {
    const lowerContent = content.toLowerCase();

    // High confidence patterns (unique keywords)
    if (lowerContent.includes('participant') || lowerContent.includes('actor')) {
      return { type: 'sequenceDiagram', confidence: 'high' };
    }
    if (lowerContent.includes('erdiagram') || (lowerContent.includes('entity') && lowerContent.includes('relationship'))) {
      return { type: 'erDiagram', confidence: 'high' };
    }
    if (lowerContent.includes('gantt') || lowerContent.includes('dateformat')) {
      return { type: 'gantt', confidence: 'high' };
    }
    if (lowerContent.includes('pie') && lowerContent.includes('title')) {
      return { type: 'pie', confidence: 'high' };
    }
    if (lowerContent.includes('journey') || lowerContent.includes('section')) {
      return { type: 'journey', confidence: 'medium' };
    }
    if (lowerContent.includes('gitgraph') || lowerContent.includes('commit')) {
      return { type: 'gitGraph', confidence: 'high' };
    }
    if (lowerContent.includes('mindmap')) {
      return { type: 'mindmap', confidence: 'high' };
    }
    if (lowerContent.includes('timeline')) {
      return { type: 'timeline', confidence: 'high' };
    }
    if (lowerContent.includes('quadrantchart')) {
      return { type: 'quadrantChart', confidence: 'high' };
    }
    if (lowerContent.includes('requirement') && lowerContent.includes('element')) {
      return { type: 'requirementDiagram', confidence: 'high' };
    }

    // Medium confidence patterns
    if (lowerContent.includes('class ') && lowerContent.includes('{')) {
      return { type: 'classDiagram', confidence: 'medium' };
    }
    if (lowerContent.includes('state ') || lowerContent.includes('[*]')) {
      return { type: 'stateDiagram-v2', confidence: 'medium' };  // Use v2 (current version)
    }

    // Low confidence patterns (common keywords)
    if (lowerContent.includes('-->') || lowerContent.includes('->')) {
      // Could be flowchart or graph
      if (lowerContent.includes('subgraph')) {
        return { type: 'flowchart TD', confidence: 'low' };
      }
      return { type: 'graph TD', confidence: 'low' };
    }

    // C4 diagrams
    if (lowerContent.includes('person') || lowerContent.includes('system') || lowerContent.includes('container')) {
      if (lowerContent.includes('deployment')) {
        return { type: 'C4Deployment', confidence: 'medium' };
      }
      if (lowerContent.includes('component')) {
        return { type: 'C4Component', confidence: 'medium' };
      }
      if (lowerContent.includes('container')) {
        return { type: 'C4Container', confidence: 'medium' };
      }
      return { type: 'C4Context', confidence: 'medium' };
    }

    return null;
  }

  /**
   * Repairs a Mermaid diagram file by adding missing diagram type declaration
   * @param fileUri - URI of the file to repair
   * @returns Repair result
   */
  async repair(fileUri: vscode.Uri): Promise<MermaidRepairResult> {
    const result: MermaidRepairResult = {
      filePath: fileUri.fsPath,
      repaired: false,
      inferredType: null,
      confidence: null,
      backupCreated: false,
      error: null
    };

    try {
      // Read file content
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      const content = new TextDecoder('utf-8').decode(contentBytes);

      // Validate first
      const validator = new MermaidValidator();
      const validationResult = validator.validate(fileUri.fsPath, content);

      if (validationResult.valid) {
        // Already valid, no repair needed
        return result;
      }

      // Try to infer diagram type
      const inference = this.inferDiagramType(content);

      if (!inference) {
        result.error = 'Could not infer diagram type from content';
        return result;
      }

      result.inferredType = inference.type;
      result.confidence = inference.confidence;

      // Only auto-repair high and medium confidence
      if (inference.confidence === 'low') {
        result.error = 'Confidence too low for automatic repair';
        return result;
      }

      // Create backup
      const backupUri = vscode.Uri.file(fileUri.fsPath + '.bak');
      await vscode.workspace.fs.copy(fileUri, backupUri, { overwrite: true });
      result.backupCreated = true;

      // Prepend diagram type declaration
      const repairedContent = `${inference.type}\n${content}`;

      // Write repaired content
      await vscode.workspace.fs.writeFile(
        fileUri,
        new TextEncoder().encode(repairedContent)
      );

      result.repaired = true;

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Repairs multiple Mermaid diagram files
   * @param fileUris - Array of file URIs to repair
   * @returns Array of repair results
   */
  async repairMultiple(fileUris: vscode.Uri[]): Promise<MermaidRepairResult[]> {
    const results: MermaidRepairResult[] = [];

    for (const uri of fileUris) {
      const result = await this.repair(uri);
      results.push(result);
    }

    return results;
  }

  /**
   * Gets a summary of repair results
   * @param results - Array of repair results
   * @returns Summary object
   */
  getSummary(results: MermaidRepairResult[]): {
    total: number;
    repaired: number;
    alreadyValid: number;
    requiresManual: number;
    failed: number;
  } {
    return {
      total: results.length,
      repaired: results.filter(r => r.repaired).length,
      alreadyValid: results.filter(r => !r.repaired && !r.error && !r.inferredType).length,
      requiresManual: results.filter(r => !r.repaired && r.inferredType && r.confidence === 'low').length,
      failed: results.filter(r => r.error !== null && r.confidence !== 'low').length
    };
  }
}
