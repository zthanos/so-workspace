/**
 * Validation result for a single Mermaid diagram file
 */
export interface MermaidValidationResult {
  filePath: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates Mermaid diagram syntax
 */
export class MermaidValidator {
  // Valid Mermaid diagram type declarations
  private static readonly VALID_DIAGRAM_TYPES = [
    'sequenceDiagram',
    'flowchart',
    'graph',
    'classDiagram',
    'stateDiagram',      // Legacy - use stateDiagram-v2 instead
    'stateDiagram-v2',
    'erDiagram',
    'journey',
    'gantt',
    'pie',
    'gitGraph',
    'mindmap',
    'timeline',
    'quadrantChart',
    'requirementDiagram',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment'
  ];

  // Deprecated diagram types that should trigger warnings
  private static readonly DEPRECATED_DIAGRAM_TYPES = new Map<string, string>([
    ['stateDiagram', 'stateDiagram-v2']
  ]);

  /**
   * Validates a Mermaid diagram file
   * @param filePath - Path to the .mmd file
   * @param content - Content of the file
   * @returns Validation result
   */
  validate(filePath: string, content: string): MermaidValidationResult {
    const result: MermaidValidationResult = {
      filePath,
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if content is empty
    if (!content || content.trim().length === 0) {
      result.valid = false;
      result.errors.push('File is empty');
      return result;
    }

    // Get first non-empty, non-comment line
    const lines = content.split('\n');
    let firstContentLine = '';
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('%%')) {
        firstContentLine = line;
        lineNumber = i + 1;
        break;
      }
    }

    // Check if first line contains a valid diagram type declaration
    const hasDiagramType = MermaidValidator.VALID_DIAGRAM_TYPES.some(type =>
      firstContentLine.startsWith(type)
    );

    if (!hasDiagramType) {
      result.valid = false;
      result.errors.push(
        `Missing diagram type declaration at line ${lineNumber}. ` +
        `Expected one of: ${MermaidValidator.VALID_DIAGRAM_TYPES.slice(0, 5).join(', ')}, etc. ` +
        `Found: "${firstContentLine.substring(0, 50)}${firstContentLine.length > 50 ? '...' : ''}"`
      );
    } else {
      // Check for deprecated diagram types
      for (const [deprecated, replacement] of MermaidValidator.DEPRECATED_DIAGRAM_TYPES) {
        if (firstContentLine.startsWith(deprecated)) {
          result.warnings.push(
            `Diagram type '${deprecated}' is deprecated. Consider using '${replacement}' instead for better compatibility.`
          );
          break;
        }
      }
    }

    return result;
  }

  /**
   * Validates multiple Mermaid diagram files
   * @param files - Array of file paths and contents
   * @returns Array of validation results
   */
  validateMultiple(files: Array<{ path: string; content: string }>): MermaidValidationResult[] {
    return files.map(file => this.validate(file.path, file.content));
  }

  /**
   * Gets a summary of validation results
   * @param results - Array of validation results
   * @returns Summary object
   */
  getSummary(results: MermaidValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    errors: number;
    warnings: number;
  } {
    return {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      errors: results.reduce((sum, r) => sum + r.errors.length, 0),
      warnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
    };
  }
}
