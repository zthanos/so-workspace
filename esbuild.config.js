const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Check if we're in watch mode
const isWatch = process.argv.includes('--watch');

// Build configuration
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: [
    'vscode', // VS Code API is provided by the host
    'puppeteer', // Puppeteer is optional and not bundled
  ],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch, // Don't minify in watch mode for better debugging
  treeShaking: true, // Enable tree-shaking to remove unused code
  metafile: !isWatch, // Generate metafile for bundle analysis in production builds
  logLevel: 'info',
  // Optimize for size
  ...(isWatch ? {} : {
    legalComments: 'none', // Remove license comments to reduce size
  })
};

// Copy scripts directory after build
function copyScripts() {
  const src = 'scripts';
  const dest = 'dist/scripts';
  
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log('Scripts copied successfully');
  } else {
    console.warn('Warning: scripts directory not found');
  }
}

// Copy mermaid library to dist
function copyMermaid() {
  const srcDir = 'node_modules/mermaid/dist';
  const destDir = 'dist/mermaid';
  
  try {
    if (fs.existsSync(srcDir)) {
      // Copy entire mermaid dist directory
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log('Mermaid library and chunks copied successfully');
    } else {
      console.warn('Warning: mermaid library not found at', srcDir);
    }
  } catch (error) {
    console.error('Failed to copy mermaid library:', error);
  }
}

// Copy webview files to dist
function copyWebviewFiles() {
  const files = [
    { src: 'src/diagram-previewer/webview/main.js', dest: 'dist/webview-main.js' },
    { src: 'src/diagram-previewer/webview/index.html', dest: 'dist/webview-index.html' }
  ];
  
  for (const file of files) {
    try {
      if (fs.existsSync(file.src)) {
        fs.copyFileSync(file.src, file.dest);
        console.log(`Copied ${file.src} to ${file.dest}`);
      } else {
        console.warn(`Warning: ${file.src} not found`);
      }
    } catch (error) {
      console.error(`Failed to copy ${file.src}:`, error);
    }
  }
}

async function build() {
  try {
    if (isWatch) {
      // Watch mode
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
      
      // Copy scripts, mermaid, and webview files initially
      copyScripts();
      copyMermaid();
      copyWebviewFiles();
    } else {
      // Single build
      const result = await esbuild.build(buildOptions);
      console.log('Build completed successfully');
      
      // Copy scripts, mermaid, and webview files after build
      copyScripts();
      copyMermaid();
      copyWebviewFiles();
      
      // Write metafile for bundle analysis
      if (result.metafile) {
        fs.writeFileSync('dist/meta.json', JSON.stringify(result.metafile, null, 2));
        console.log('Bundle analysis written to dist/meta.json');
        console.log('Analyze with: npx esbuild-visualizer --metadata dist/meta.json');
      }
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
