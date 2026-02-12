/**
 * Test script for Mermaid diagram validation and repair workflow
 * This script tests the end-to-end workflow without requiring VS Code extension context
 */

const fs = require('fs');
const path = require('path');

// Simple validator implementation for testing
class TestMermaidValidator {
  static VALID_DIAGRAM_TYPES = [
    'sequenceDiagram',
    'flowchart',
    'graph',
    'classDiagram',
    'stateDiagram',
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

  validate(filePath, content) {
    const result = {
      filePath,
      valid: true,
      errors: [],
      warnings: []
    };

    if (!content || content.trim().length === 0) {
      result.valid = false;
      result.errors.push('File is empty');
      return result;
    }

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

    const hasDiagramType = TestMermaidValidator.VALID_DIAGRAM_TYPES.some(type =>
      firstContentLine.startsWith(type)
    );

    if (!hasDiagramType) {
      result.valid = false;
      result.errors.push(
        `Missing diagram type declaration at line ${lineNumber}. ` +
        `Expected one of: ${TestMermaidValidator.VALID_DIAGRAM_TYPES.slice(0, 5).join(', ')}, etc.`
      );
    }

    return result;
  }
}

// Simple repairer implementation for testing
class TestMermaidRepairer {
  inferDiagramType(content) {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('participant') || lowerContent.includes('actor')) {
      return { type: 'sequenceDiagram', confidence: 'high' };
    }
    if (lowerContent.includes('-->') || lowerContent.includes('->')) {
      if (lowerContent.includes('subgraph')) {
        return { type: 'flowchart TD', confidence: 'low' };
      }
      return { type: 'graph TD', confidence: 'low' };
    }

    return null;
  }

  repair(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const validator = new TestMermaidValidator();
    const validationResult = validator.validate(filePath, content);

    const result = {
      filePath,
      repaired: false,
      inferredType: null,
      confidence: null,
      backupCreated: false,
      error: null
    };

    if (validationResult.valid) {
      return result;
    }

    const inference = this.inferDiagramType(content);

    if (!inference) {
      result.error = 'Could not infer diagram type from content';
      return result;
    }

    result.inferredType = inference.type;
    result.confidence = inference.confidence;

    if (inference.confidence === 'low') {
      result.error = 'Confidence too low for automatic repair';
      return result;
    }

    // Create backup
    const backupPath = filePath + '.bak';
    fs.copyFileSync(filePath, backupPath);
    result.backupCreated = true;

    // Prepend diagram type
    const repairedContent = `${inference.type}\n${content}`;
    fs.writeFileSync(filePath, repairedContent, 'utf-8');
    result.repaired = true;

    return result;
  }
}

// Test workflow
console.log('=== Mermaid Diagram Workflow Test ===\n');

const diagramsDir = path.join(__dirname, 'diagrams');
const files = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.mmd'));

console.log(`Found ${files.length} Mermaid files\n`);

// Step 1: Validate all files
console.log('Step 1: Validating files...');
const validator = new TestMermaidValidator();
const validationResults = [];

for (const file of files) {
  const filePath = path.join(diagramsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = validator.validate(filePath, content);
  validationResults.push(result);
  
  console.log(`  ${file}: ${result.valid ? 'VALID' : 'INVALID'}`);
  if (!result.valid) {
    result.errors.forEach(err => console.log(`    - ${err}`));
  }
}

const invalidCount = validationResults.filter(r => !r.valid).length;
console.log(`\nValidation summary: ${validationResults.length - invalidCount} valid, ${invalidCount} invalid\n`);

// Step 2: Repair invalid files
if (invalidCount > 0) {
  console.log('Step 2: Repairing invalid files...');
  const repairer = new TestMermaidRepairer();
  const repairResults = [];

  for (const file of files) {
    const filePath = path.join(diagramsDir, file);
    const result = repairer.repair(filePath);
    
    if (result.repaired || result.error) {
      repairResults.push(result);
      console.log(`  ${file}:`);
      if (result.repaired) {
        console.log(`    - Repaired with type: ${result.inferredType} (${result.confidence} confidence)`);
        console.log(`    - Backup created: ${result.backupCreated}`);
      } else if (result.error) {
        console.log(`    - ${result.error}`);
      }
    }
  }

  const repairedCount = repairResults.filter(r => r.repaired).length;
  const manualCount = repairResults.filter(r => r.error && r.confidence === 'low').length;
  console.log(`\nRepair summary: ${repairedCount} repaired, ${manualCount} require manual intervention\n`);
}

// Step 3: Re-validate all files
console.log('Step 3: Re-validating files...');
const revalidationResults = [];

for (const file of files) {
  const filePath = path.join(diagramsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = validator.validate(filePath, content);
  revalidationResults.push(result);
  
  console.log(`  ${file}: ${result.valid ? 'VALID' : 'INVALID'}`);
}

const finalInvalidCount = revalidationResults.filter(r => !r.valid).length;
console.log(`\nFinal validation: ${revalidationResults.length - finalInvalidCount} valid, ${finalInvalidCount} invalid\n`);

// Summary
console.log('=== Test Complete ===');
console.log(`Initial state: ${invalidCount} invalid files`);
console.log(`Final state: ${finalInvalidCount} invalid files`);
console.log(`Success: ${finalInvalidCount < invalidCount ? 'YES' : 'NO'}`);

process.exit(finalInvalidCount > 0 ? 1 : 0);
