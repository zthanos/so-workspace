/**
 * DSL Validator for Structurizr DSL files
 * Validates DSL structure, syntax, and semantic correctness
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column?: number;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  line: number;
  message: string;
  severity: 'warning';
}

export interface DSLStructure {
  hasWorkspace: boolean;
  hasModel: boolean;
  hasViews: boolean;
  identifiers: Map<string, number[]>; // identifier -> line numbers (all occurrences)
  relationships: Array<{ line: number; syntax: string }>;
  views: Array<{ line: number; type: string }>;
}

export class DSLValidator {
  /**
   * Validate a Structurizr DSL file
   * @param dslContent The DSL file content as a string
   * @returns ValidationResult with errors and warnings
   */
  validate(dslContent: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Parse DSL structure
    const structure = this.parseDSLStructure(dslContent);
    
    // Validate required sections
    this.validateRequiredSections(structure, errors);
    
    // Validate identifier uniqueness
    this.validateIdentifierUniqueness(structure, errors);
    
    // Validate relationship syntax
    this.validateRelationshipSyntax(structure, errors);
    
    // Validate view configuration
    this.validateViewConfiguration(structure, errors, warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Parse DSL content to extract structure information
   */
  private parseDSLStructure(dslContent: string): DSLStructure {
    const lines = dslContent.split('\n');
    const structure: DSLStructure = {
      hasWorkspace: false,
      hasModel: false,
      hasViews: false,
      identifiers: new Map(),
      relationships: [],
      views: []
    };

    let inModel = false;
    let inViews = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        continue;
      }

      // Check for workspace
      if (line.startsWith('workspace ')) {
        structure.hasWorkspace = true;
      }

      // Track brace depth
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceDepth += openBraces - closeBraces;

      // Check for model section
      if (line === 'model {') {
        structure.hasModel = true;
        inModel = true;
        inViews = false;
        continue;
      }

      // Check for views section
      if (line === 'views {') {
        structure.hasViews = true;
        inViews = true;
        inModel = false;
        continue;
      }

      // Exit sections when closing brace at depth 1
      if (line === '}' && braceDepth === 1) {
        inModel = false;
        inViews = false;
        continue;
      }

      // Parse identifiers in model section
      if (inModel && line.includes('=')) {
        const match = line.match(/^\s*(\w+)\s*=/);
        if (match) {
          const identifier = match[1];
          if (!structure.identifiers.has(identifier)) {
            structure.identifiers.set(identifier, []);
          }
          structure.identifiers.get(identifier)!.push(lineNumber);
        }
      }

      // Parse relationships (lines with ->)
      if (inModel && line.includes('->')) {
        structure.relationships.push({
          line: lineNumber,
          syntax: line
        });
      }

      // Parse views
      if (inViews) {
        if (line.startsWith('systemContext ')) {
          structure.views.push({ line: lineNumber, type: 'systemContext' });
        } else if (line.startsWith('container ')) {
          structure.views.push({ line: lineNumber, type: 'container' });
        } else if (line.startsWith('component ')) {
          structure.views.push({ line: lineNumber, type: 'component' });
        }
      }
    }

    return structure;
  }

  /**
   * Validate that required sections are present
   */
  private validateRequiredSections(
    structure: DSLStructure,
    errors: ValidationError[]
  ): void {
    if (!structure.hasWorkspace) {
      errors.push({
        line: 1,
        message: 'Missing required "workspace" definition',
        severity: 'error'
      });
    }

    if (!structure.hasModel) {
      errors.push({
        line: 1,
        message: 'Missing required "model" section',
        severity: 'error'
      });
    }

    if (!structure.hasViews) {
      errors.push({
        line: 1,
        message: 'Missing required "views" section',
        severity: 'error'
      });
    }
  }

  /**
   * Validate that all identifiers are unique
   */
  private validateIdentifierUniqueness(
    structure: DSLStructure,
    errors: ValidationError[]
  ): void {
    // Report duplicates
    structure.identifiers.forEach((lines, identifier) => {
      if (lines.length > 1) {
        // Report error on each duplicate occurrence after the first
        for (let i = 1; i < lines.length; i++) {
          errors.push({
            line: lines[i],
            message: `Duplicate identifier "${identifier}" (first defined on line ${lines[0]})`,
            severity: 'error'
          });
        }
      }
    });
  }

  /**
   * Validate relationship syntax
   */
  private validateRelationshipSyntax(
    structure: DSLStructure,
    errors: ValidationError[]
  ): void {
    // Relationship pattern: identifier -> identifier "description" ["technology"]
    const relationshipPattern = /^\s*(\w+)\s*->\s*(\w+)\s+"[^"]*"(\s+"[^"]*")?\s*$/;

    structure.relationships.forEach(({ line, syntax }) => {
      // Remove trailing comments
      const cleanSyntax = syntax.split('//')[0].trim();
      
      if (!relationshipPattern.test(cleanSyntax)) {
        errors.push({
          line,
          message: `Invalid relationship syntax. Expected format: source -> destination "description" ["technology"]`,
          severity: 'error'
        });
      }
    });
  }

  /**
   * Validate view configuration
   */
  private validateViewConfiguration(
    structure: DSLStructure,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (structure.views.length === 0 && structure.hasViews) {
      warnings.push({
        line: 1,
        message: 'Views section is present but contains no view definitions',
        severity: 'warning'
      });
    }

    // Note: More detailed view validation (include *, autoLayout, etc.) 
    // would require more sophisticated parsing of view blocks
    // This basic validation checks for view presence
  }

  /**
   * Validate multiple DSL files
   * @param dslContents Map of file paths to DSL content
   * @returns Map of file paths to validation results
   */
  validateAll(dslContents: Map<string, string>): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    
    dslContents.forEach((content, filePath) => {
      results.set(filePath, this.validate(content));
    });
    
    return results;
  }
}
