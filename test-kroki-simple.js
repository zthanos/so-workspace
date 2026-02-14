// Simple test to verify Kroki API works
const pako = require('pako');

const content = `@startuml
class User {
  -id: string
  -name: string
}
@enduml`;

// Encode content
const compressed = pako.deflate(content, { level: 9 });
const base64 = Buffer.from(compressed).toString('base64');
const base64url = base64
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const url = `https://kroki.io/plantuml/svg/${base64url}`;

console.log('Testing Kroki API...');
console.log('URL:', url);

fetch(url)
  .then(response => {
    console.log('Status:', response.status);
    return response.text();
  })
  .then(svg => {
    console.log('SVG length:', svg.length);
    console.log('SVG preview:', svg.substring(0, 200));
  })
  .catch(error => {
    console.error('Error:', error);
  });
