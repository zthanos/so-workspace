// PlantUML rendering using plantuml-wasm
const plantuml = require('plantuml-wasm');
const fs = require('fs');
const path = require('path');

// Get input and output directory from command line arguments
const inputFile = process.argv[2];
const outputDir = process.argv[3];

async function render() {
  try {
    // Read the PlantUML file content
    let content = fs.readFileSync(inputFile, 'utf-8');
    
    // Offline C4 Fix: Replace includes with local files if they exist
    // This regex matches !include <C4/FileName> and replaces with local file path
    content = content.replace(/!include\s+<C4\/(\w+)>/g, (match, fileName) => {
      // Try to find the C4 file in the same directory as the input file or in a C4 subdirectory
      const inputFileDir = path.dirname(inputFile);
      const localPath1 = path.join(inputFileDir, 'C4', fileName);
      const localPath2 = path.join(inputFileDir, fileName);
      
      if (fs.existsSync(localPath1)) {
        return `!include "${localPath1}"`;
      } else if (fs.existsSync(localPath2)) {
        return `!include "${localPath2}"`;
      }
      
      // If file doesn't exist locally, keep original
      return match;
    });
    
    // Generate SVG using plantuml-wasm
    const svg = await plantuml.generateSVG(content);
    
    // Write output file
    const outFile = path.join(outputDir, path.basename(inputFile).replace('.puml', '.svg'));
    fs.writeFileSync(outFile, svg);
    
    console.log(`Successfully rendered: ${path.basename(inputFile)}`);
  } catch (error) {
    console.error('Error rendering PlantUML:', error);
    process.exit(1);
  }
}

render().catch(console.error);