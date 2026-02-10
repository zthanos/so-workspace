/**
 * Standalone test script to verify Mermaid rendering works with Puppeteer
 * Run with: node test-mermaid-render.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testMermaidRender() {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('Creating page...');
    const page = await browser.newPage();
    
    console.log('Setting up Mermaid...');
    await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    window.mermaid = mermaid;
  </script>
</head>
<body>
  <div id="diagram-container"></div>
</body>
</html>
    `);
    
    console.log('Waiting for Mermaid to load...');
    await page.waitForFunction(() => window.mermaid !== undefined, { timeout: 10000 });
    
    console.log('Rendering diagram...');
    const content = `
graph TB
    subgraph "Agent Execution"
        WE[Workflow Engine]
        LLM[LLM Service]
    end
    subgraph "Streaming Layer"
        SE[Stream Event]
        SSE[SSE Manager]
    end
    subgraph "Frontend"
        JSH[LlmSSE Hook]
        LV[LiveView]
        MC[Messages Component]
        WP[Workflow Progress]
    end
    WE -->|step events| SE
    LLM -->|token events| SE
    SE --> SSE
    SSE -->|SSE stream| JSH
    JSH -->|sse_step_execution| LV
    JSH -->|sse_token| LV
    LV -->|step updates| WP
    LV -->|token updates| MC
`;
    
    const svg = await page.evaluate(async (diagramContent) => {
      try {
        const result = await window.mermaid.render('test-diagram', diagramContent);
        return result.svg;
      } catch (error) {
        throw new Error(`Mermaid render error: ${error.message}`);
      }
    }, content);
    
    console.log('✅ Rendering successful!');
    console.log(`SVG length: ${svg.length} characters`);
    
    // Save to file
    const outputPath = path.join(__dirname, 'test-output.svg');
    fs.writeFileSync(outputPath, svg, 'utf-8');
    console.log(`✅ SVG saved to: ${outputPath}`);
    
    await page.close();
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await browser.close();
  }
}

testMermaidRender()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
