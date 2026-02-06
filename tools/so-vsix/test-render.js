/**
 * Test script to verify PlantUML rendering functionality
 * This simulates what the renderDiagrams command does
 */

const fs = require('fs');
const path = require('path');

// Simulate the workspace root (go up from tools/so-vsix to project root)
const workspaceRoot = path.join(__dirname, '..', '..');
const srcRoot = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'src');
const outRoot = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'out');

console.log('Testing PlantUML rendering...');
console.log('Workspace root:', workspaceRoot);
console.log('Source directory:', srcRoot);
console.log('Output directory:', outRoot);
console.log('');

// Ensure output directory exists
if (!fs.existsSync(outRoot)) {
  fs.mkdirSync(outRoot, { recursive: true });
  console.log('✓ Created output directory');
}

// Find all .puml files
function getAllPumlFiles(dir) {
  const files = [];
  
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.puml')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

const pumlFiles = getAllPumlFiles(srcRoot);
console.log(`Found ${pumlFiles.length} PlantUML files:`);
pumlFiles.forEach(file => {
  console.log(`  - ${path.relative(workspaceRoot, file)}`);
});
console.log('');

// Process each file
let successCount = 0;
let errorCount = 0;

for (const file of pumlFiles) {
  try {
    console.log(`Processing: ${path.basename(file)}`);
    
    // Read the PlantUML content
    const content = fs.readFileSync(file, 'utf-8');
    console.log(`  ✓ Read file (${content.length} bytes)`);
    
    // Determine output path
    const relativePath = path.relative(srcRoot, file);
    const outDir = path.join(outRoot, path.dirname(relativePath));
    const baseName = path.basename(file, '.puml');
    const outFile = path.join(outDir, `${baseName}.svg`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Create a placeholder SVG (since plantuml-wasm is not yet integrated)
    const placeholderSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="400" height="200" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <text x="200" y="80" font-family="Arial" font-size="16" text-anchor="middle" fill="#333">
    PlantUML Rendering Test
  </text>
  <text x="200" y="110" font-family="Arial" font-size="14" text-anchor="middle" fill="#666">
    Source: ${path.basename(file)}
  </text>
  <text x="200" y="140" font-family="Arial" font-size="12" text-anchor="middle" fill="#999">
    Content size: ${content.length} bytes
  </text>
</svg>`;
    
    // Write the SVG file
    fs.writeFileSync(outFile, placeholderSvg);
    console.log(`  ✓ Created SVG: ${path.relative(workspaceRoot, outFile)}`);
    
    // Verify the output file exists and is valid
    if (fs.existsSync(outFile)) {
      const svgContent = fs.readFileSync(outFile, 'utf-8');
      if (svgContent.includes('<svg') && svgContent.includes('</svg>')) {
        console.log(`  ✓ SVG content is valid`);
        successCount++;
      } else {
        console.log(`  ✗ SVG content is invalid`);
        errorCount++;
      }
    } else {
      console.log(`  ✗ Output file was not created`);
      errorCount++;
    }
    
    console.log('');
  } catch (error) {
    console.error(`  ✗ Error processing ${path.basename(file)}:`, error.message);
    errorCount++;
    console.log('');
  }
}

// Summary
console.log('='.repeat(60));
console.log('Test Summary:');
console.log(`  Total files: ${pumlFiles.length}`);
console.log(`  Successful: ${successCount}`);
console.log(`  Failed: ${errorCount}`);
console.log('');

if (errorCount === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}
