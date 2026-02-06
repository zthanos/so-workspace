/**
 * Test script to render all PlantUML diagrams using the actual implementation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const plantumlEncoder = require('plantuml-encoder');

const workspaceRoot = path.join(__dirname, '..', '..');
const srcRoot = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'src');
const outRoot = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'out');

console.log('Testing PlantUML rendering for all diagrams...');
console.log('Source directory:', srcRoot);
console.log('Output directory:', outRoot);
console.log('');

// Ensure output directory exists
if (!fs.existsSync(outRoot)) {
  fs.mkdirSync(outRoot, { recursive: true });
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

// Render PlantUML to SVG
async function renderPlantUmlToSvg(pumlContent) {
  return new Promise((resolve, reject) => {
    try {
      const encoded = plantumlEncoder.encode(pumlContent);
      const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`PlantUML server returned status ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        reject(new Error(`Failed to fetch from PlantUML server: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to encode PlantUML: ${error}`));
    }
  });
}

// Process all files
async function processAllFiles() {
  const pumlFiles = getAllPumlFiles(srcRoot);
  console.log(`Found ${pumlFiles.length} PlantUML files:`);
  pumlFiles.forEach(file => {
    console.log(`  - ${path.relative(workspaceRoot, file)}`);
  });
  console.log('');
  
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
      
      // Render to SVG
      console.log(`  ⏳ Rendering diagram...`);
      const svg = await renderPlantUmlToSvg(content);
      console.log(`  ✓ Rendered (${svg.length} bytes)`);
      
      // Write the SVG file
      fs.writeFileSync(outFile, svg);
      console.log(`  ✓ Saved to: ${path.relative(workspaceRoot, outFile)}`);
      
      // Validate SVG content
      if (svg.includes('<svg') && svg.includes('</svg>')) {
        console.log(`  ✓ SVG content is valid`);
        successCount++;
      } else {
        console.log(`  ✗ SVG content is invalid`);
        errorCount++;
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
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
    console.log('✓ All diagrams rendered successfully!');
    return 0;
  } else {
    console.log('✗ Some diagrams failed to render');
    return 1;
  }
}

// Run the test
processAllFiles()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
