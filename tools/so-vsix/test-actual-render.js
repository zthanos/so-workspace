/**
 * Test script to verify actual PlantUML rendering with plantuml-encoder
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const plantumlEncoder = require('plantuml-encoder');

// Test with the simple test file
const workspaceRoot = path.join(__dirname, '..', '..');
const testFile = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'src', 'test_simple.puml');
const outFile = path.join(workspaceRoot, 'docs', '03_architecture', 'diagrams', 'out', 'test_simple.svg');

console.log('Testing actual PlantUML rendering...');
console.log('Test file:', testFile);
console.log('Output file:', outFile);
console.log('');

// Read the PlantUML content
const content = fs.readFileSync(testFile, 'utf-8');
console.log('PlantUML content:');
console.log(content);
console.log('');

// Encode the content
const encoded = plantumlEncoder.encode(content);
console.log('Encoded:', encoded);
console.log('');

// Generate URL
const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
console.log('PlantUML Server URL:', url);
console.log('');

// Fetch the SVG
console.log('Fetching SVG from PlantUML server...');
https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✓ Successfully fetched SVG');
      console.log(`  SVG size: ${data.length} bytes`);
      
      // Write to file
      fs.writeFileSync(outFile, data);
      console.log(`✓ Wrote SVG to: ${outFile}`);
      
      // Validate SVG content
      if (data.includes('<svg') && data.includes('</svg>')) {
        console.log('✓ SVG content is valid');
        
        // Check if it contains expected elements
        if (data.includes('User') || data.includes('System') || data.includes('Database')) {
          console.log('✓ SVG contains expected diagram elements');
        } else {
          console.log('⚠ SVG may not contain expected diagram elements');
        }
        
        console.log('');
        console.log('✓ Test PASSED - Actual PlantUML rendering works!');
        process.exit(0);
      } else {
        console.log('✗ SVG content is invalid');
        process.exit(1);
      }
    } else {
      console.error(`✗ PlantUML server returned status ${res.statusCode}`);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`✗ Failed to fetch from PlantUML server: ${err.message}`);
  process.exit(1);
});
