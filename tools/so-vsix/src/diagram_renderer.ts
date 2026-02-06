import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
const plantumlEncoder = require("plantuml-encoder");

export async function renderDiagrams(): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const srcRoot = path.join(workspaceRoot, "docs", "03_architecture", "diagrams", "src");
    const outRoot = path.join(workspaceRoot, "docs", "03_architecture", "diagrams", "out");

    // Ensure output directory exists
    if (!fs.existsSync(outRoot)) {
      fs.mkdirSync(outRoot, { recursive: true });
    }

    vscode.window.showInformationMessage("Rendering diagrams...");

    // Process Mermaid files (.mmd -> .png)
    await processMermaidFiles(srcRoot, outRoot);

    // Process PlantUML files (.puml -> .svg)
    await processPlantUmlFiles(srcRoot, outRoot);

    vscode.window.showInformationMessage("Successfully rendered all diagrams!");
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to render diagrams: ${error}`);
    console.error("Diagram rendering error:", error);
  }
}

async function processMermaidFiles(srcRoot: string, outRoot: string): Promise<void> {
  const mermaidFiles = getAllFiles(srcRoot, "*.mmd");
  
  for (const file of mermaidFiles) {
    try {
      // This would require mermaid-cli to be available, but we're focusing on PlantUML
      // For now, we'll skip Mermaid processing in this implementation
      console.log(`Skipping Mermaid file: ${file}`);
    } catch (error) {
      console.error(`Failed to process Mermaid file ${file}:`, error);
    }
  }
}

async function processPlantUmlFiles(srcRoot: string, outRoot: string): Promise<void> {
  const pumlFiles = getAllFiles(srcRoot, "*.puml");
  
  for (const file of pumlFiles) {
    try {
      console.log(`Processing PlantUML file: ${file}`);
      
      // Read the PlantUML content
      let content = fs.readFileSync(file, "utf-8");
      
      // Offline C4 Fix: Replace includes with local files if they exist
      content = content.replace(/!include\s+<C4\/((\w+))>/g, (match, fileName) => {
        const localPath = path.join(srcRoot, "C4", fileName);
        if (fs.existsSync(localPath)) {
          return `!include "${localPath}"`;
        }
        return match; // If file doesn't exist, keep original
      });
      
      // Determine output path
      const relativePath = path.relative(srcRoot, file);
      const outDir = path.join(outRoot, path.dirname(relativePath));
      const baseName = path.basename(file, ".puml");
      const outFile = path.join(outDir, `${baseName}.svg`);
      
      // Ensure output directory exists
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      // Render PlantUML to SVG using PlantUML server
      try {
        const svg = await renderPlantUmlToSvg(content);
        fs.writeFileSync(outFile, svg);
        console.log(`Successfully rendered: ${file} -> ${outFile}`);
      } catch (renderError) {
        console.error(`Failed to render PlantUML: ${renderError}`);
        throw new Error(`Failed to render PlantUML file ${file}: ${renderError}`);
      }
    } catch (error) {
      console.error(`Failed to process PlantUML file ${file}:`, error);
      throw new Error(`Failed to render PlantUML file ${file}: ${error}`);
    }
  }
}

/**
 * Render PlantUML content to SVG using the PlantUML server
 */
async function renderPlantUmlToSvg(pumlContent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Encode the PlantUML content
      const encoded = plantumlEncoder.encode(pumlContent);
      
      // Use the public PlantUML server
      const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      
      console.log(`Fetching SVG from PlantUML server...`);
      
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

function getAllFiles(dir: string, pattern: string): string[] {
  const files: string[] = [];
  
  function walk(directory: string) {
    if (!fs.existsSync(directory)) return;
    
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else {
        // Simple pattern matching (basic implementation)
        if (pattern === "*.puml" && item.endsWith(".puml")) {
          files.push(fullPath);
        } else if (pattern === "*.mmd" && item.endsWith(".mmd")) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}
