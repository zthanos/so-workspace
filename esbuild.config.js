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
  external: ['vscode'], // VS Code API is provided by the host
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch, // Don't minify in watch mode for better debugging
  logLevel: 'info'
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

async function build() {
  try {
    if (isWatch) {
      // Watch mode
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
      
      // Copy scripts initially
      copyScripts();
    } else {
      // Single build
      await esbuild.build(buildOptions);
      console.log('Build completed successfully');
      
      // Copy scripts after build
      copyScripts();
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
