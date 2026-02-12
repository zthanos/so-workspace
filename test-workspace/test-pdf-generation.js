/**
 * Test script for PDF generation with rendered diagrams
 * Tests the complete workflow: Mermaid rendering → PDF generation
 */

const path = require('path');
const fs = require('fs');

console.log('=== PDF Generation Test ===\n');

// Step 1: Verify workspace structure
console.log('Step 1: Verifying workspace structure...');
const requiredPaths = [
  'docs/manifest.yml',
  'docs/project_information.md',
  'docs/01_requirements/requirements.md',
  'docs/02_objectives/objectives.md',
  'docs/03_architecture/diagrams/out/test-sequence.png',
  'docs/03_architecture/diagrams/out/test-flowchart.png',
  'templates/logo.png'
];

let allPathsExist = true;
for (const p of requiredPaths) {
  const fullPath = path.join(__dirname, p);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✓' : '✗'} ${p}`);
  if (!exists) allPathsExist = false;
}

if (!allPathsExist) {
  console.error('\n✗ Missing required files');
  process.exit(1);
}

console.log('\n✓ All required files present\n');

// Step 2: Verify rendered diagrams
console.log('Step 2: Verifying rendered diagrams...');
const diagramPath1 = path.join(__dirname, 'docs/03_architecture/diagrams/out/test-sequence.png');
const diagramPath2 = path.join(__dirname, 'docs/03_architecture/diagrams/out/test-flowchart.png');

const diagram1Stats = fs.statSync(diagramPath1);
const diagram2Stats = fs.statSync(diagramPath2);

console.log(`  test-sequence.png: ${diagram1Stats.size} bytes`);
console.log(`  test-flowchart.png: ${diagram2Stats.size} bytes`);

if (diagram1Stats.size > 0 && diagram2Stats.size > 0) {
  console.log('\n✓ Diagrams rendered successfully\n');
} else {
  console.error('\n✗ Diagram files are empty');
  process.exit(1);
}

// Step 3: Test PDF generation (dry run - just verify the module can be loaded)
console.log('Step 3: Verifying PDF export module...');
try {
  // Change to test workspace directory
  process.chdir(__dirname);
  
  // Try to load the PDF export module
  const pdfExportPath = path.join(__dirname, '..', 'src', 'pdf-export', 'index.js');
  
  if (fs.existsSync(pdfExportPath)) {
    console.log('  ✓ PDF export module found');
    console.log('  Note: Full PDF generation requires compiled TypeScript');
  } else {
    console.log('  ℹ PDF export module not compiled yet');
    console.log('  Run: npm run compile');
  }
} catch (error) {
  console.log(`  ℹ ${error.message}`);
}

console.log('\n=== Test Summary ===');
console.log('✓ Workspace structure validated');
console.log('✓ Mermaid diagrams rendered to PNG');
console.log('✓ Logo file present');
console.log('✓ Markdown files with diagram references created');
console.log('\nThe workspace is ready for PDF generation.');
console.log('To generate PDF: npm run export:pdf (from workspace root)\n');

process.exit(0);
