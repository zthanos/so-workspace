#!/usr/bin/env node

/**
 * VSIX Build Verification Script
 * 
 * This script verifies that the built VSIX package meets all packaging requirements:
 * - VSIX size is under 10MB
 * - node_modules directory is NOT present
 * - dist/extension.js exists (bundled output)
 * - @mermaid-js/mermaid-cli is NOT present
 * - Essential files are present (package.json, README.md, assets/)
 * 
 * Usage: node scripts/verify-vsix-contents.js [vsix-file-path]
 * 
 * Exit codes:
 *   0 - Verification passed
 *   1 - Verification failed
 *   2 - VSIX file not found or invalid
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Maximum allowed VSIX size (10MB in bytes)
const MAX_VSIX_SIZE_MB = 10;
const MAX_VSIX_SIZE_BYTES = MAX_VSIX_SIZE_MB * 1024 * 1024;

// Essential files that must exist in the VSIX
const ESSENTIAL_FILES = [
  'extension/package.json',
  'extension/README.md',
  'extension/dist/extension.js'
];

// Required asset paths that must exist in the VSIX
const REQUIRED_ASSETS = [
  'extension/assets/agent/prompts/00_EXECUTE.prompt.md',
  'extension/assets/agent/prompts/01_requirements/00_extract_requirements_inventory.prompt.md',
  'extension/assets/agent/prompts/02_diagrams/05_generate_c4_context.prompt.md',
  'extension/assets/agent/prompts/03_objectives/01_generate_objectives.prompt.md',
  'extension/assets/agent/prompts/04_solution_outline/20_generate_solution_outline.prompt.md',
  'extension/assets/agent/rules/rules.yaml',
  'extension/assets/templates/flows.yaml.template',
  'extension/assets/templates/README_SO_Workspace.md',
  'extension/assets/templates/logo.png'
];

// Paths that must NOT exist in the VSIX
const FORBIDDEN_PATHS = [
  'extension/node_modules',
  'extension/node_modules/@mermaid-js/mermaid-cli'
];

function findVsixFile() {
  const files = fs.readdirSync('.');
  const vsixFiles = files.filter(f => f.endsWith('.vsix'));
  
  if (vsixFiles.length === 0) {
    console.error('❌ No VSIX file found in current directory');
    console.error('   Run "npm run package" first to build the VSIX');
    return null;
  }
  
  if (vsixFiles.length > 1) {
    console.warn('⚠️  Multiple VSIX files found, using most recent:');
    vsixFiles.forEach(f => console.warn(`   - ${f}`));
  }
  
  // Use the most recently modified VSIX file
  const mostRecent = vsixFiles
    .map(f => ({ name: f, mtime: fs.statSync(f).mtime }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  
  return mostRecent.name;
}

function extractVsix(vsixPath, extractDir) {
  console.log(`📦 Extracting VSIX: ${vsixPath}`);
  
  // Create temp directory
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });
  
  try {
    // VSIX files are ZIP archives
    if (process.platform === 'win32') {
      // Windows: Rename to .zip first, then use PowerShell's Expand-Archive
      const zipPath = vsixPath.replace(/\.vsix$/, '.zip');
      fs.copyFileSync(vsixPath, zipPath);
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, {
          stdio: 'pipe'
        });
      } finally {
        // Clean up the temporary .zip file
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }
    } else {
      // Unix: Use unzip
      execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`, {
        stdio: 'pipe'
      });
    }
    console.log(`✅ Extracted to: ${extractDir}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to extract VSIX: ${error.message}`);
    return false;
  }
}

function checkAssetExists(extractDir, assetPath) {
  const fullPath = path.join(extractDir, assetPath);
  return fs.existsSync(fullPath);
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function verifyVsixSize(vsixPath) {
  console.log('\n📏 Verifying VSIX size...\n');
  
  const stats = fs.statSync(vsixPath);
  const sizeBytes = stats.size;
  
  console.log(`   VSIX size: ${formatBytes(sizeBytes)}`);
  console.log(`   Maximum allowed: ${MAX_VSIX_SIZE_MB} MB`);
  
  if (sizeBytes <= MAX_VSIX_SIZE_BYTES) {
    console.log(`✅ VSIX size is under ${MAX_VSIX_SIZE_MB}MB`);
    return true;
  } else {
    console.error(`❌ VSIX size exceeds ${MAX_VSIX_SIZE_MB}MB limit!`);
    console.error(`   Actual: ${formatBytes(sizeBytes)}`);
    console.error(`   Limit: ${formatBytes(MAX_VSIX_SIZE_BYTES)}`);
    return false;
  }
}

function verifyForbiddenPaths(extractDir) {
  console.log('\n🚫 Verifying forbidden paths are NOT present...\n');
  
  let allPassed = true;
  
  for (const forbiddenPath of FORBIDDEN_PATHS) {
    const fullPath = path.join(extractDir, forbiddenPath);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      console.error(`❌ FORBIDDEN PATH FOUND: ${forbiddenPath}`);
      allPassed = false;
    } else {
      console.log(`✅ ${forbiddenPath} (correctly excluded)`);
    }
  }
  
  return allPassed;
}

function verifyEssentialFiles(extractDir) {
  console.log('\n📄 Verifying essential files...\n');
  
  let allPassed = true;
  const missingFiles = [];
  
  for (const file of ESSENTIAL_FILES) {
    const exists = checkAssetExists(extractDir, file);
    if (exists) {
      console.log(`✅ ${file}`);
    } else {
      console.error(`❌ MISSING: ${file}`);
      missingFiles.push(file);
      allPassed = false;
    }
  }
  
  return { allPassed, missingFiles };
}

function verifyAssets(extractDir) {
  console.log('\n🔍 Verifying required assets...\n');
  
  let allPassed = true;
  const missingAssets = [];
  
  // Check required assets
  for (const asset of REQUIRED_ASSETS) {
    const exists = checkAssetExists(extractDir, asset);
    if (exists) {
      console.log(`✅ ${asset}`);
    } else {
      console.error(`❌ MISSING: ${asset}`);
      missingAssets.push(asset);
      allPassed = false;
    }
  }
  
  // Check that assets/ directory exists
  const assetsDir = path.join(extractDir, 'extension', 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error('\n❌ CRITICAL: assets/ directory not found in VSIX package!');
    console.error('   The .vscodeignore file may be excluding the assets/ folder.');
    allPassed = false;
  } else {
    console.log('\n✅ assets/ directory found in VSIX package');
  }
  
  return { allPassed, missingAssets };
}

function main() {
  console.log('🚀 VSIX Build Verification\n');
  console.log('This script verifies:');
  console.log('  1. VSIX size is under 10MB');
  console.log('  2. node_modules directory is NOT present');
  console.log('  3. dist/extension.js exists (bundled output)');
  console.log('  4. @mermaid-js/mermaid-cli is NOT present');
  console.log('  5. Essential files are present (package.json, README.md, assets/)');
  console.log('');
  
  // Get VSIX file path from command line or find it
  let vsixPath = process.argv[2];
  
  if (!vsixPath) {
    vsixPath = findVsixFile();
    if (!vsixPath) {
      process.exit(2);
    }
  }
  
  // Verify VSIX file exists
  if (!fs.existsSync(vsixPath)) {
    console.error(`❌ VSIX file not found: ${vsixPath}`);
    process.exit(2);
  }
  
  // Verify VSIX size
  const sizeCheckPassed = verifyVsixSize(vsixPath);
  
  // Extract VSIX to temp directory
  const extractDir = path.join(__dirname, '..', '.vsix-verify-temp');
  if (!extractVsix(vsixPath, extractDir)) {
    process.exit(2);
  }
  
  // Run all verifications
  const forbiddenCheckPassed = verifyForbiddenPaths(extractDir);
  const { allPassed: essentialFilesPassed, missingFiles } = verifyEssentialFiles(extractDir);
  const { allPassed: assetsPassed, missingAssets } = verifyAssets(extractDir);
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  fs.rmSync(extractDir, { recursive: true, force: true });
  
  // Aggregate results
  const allChecksPassed = sizeCheckPassed && forbiddenCheckPassed && essentialFilesPassed && assetsPassed;
  
  // Report results
  console.log('\n' + '='.repeat(60));
  if (allChecksPassed) {
    console.log('✅ VERIFICATION PASSED');
    console.log('   All checks passed successfully:');
    console.log('   ✓ VSIX size is under 10MB');
    console.log('   ✓ node_modules directory is NOT present');
    console.log('   ✓ @mermaid-js/mermaid-cli is NOT present');
    console.log('   ✓ dist/extension.js exists');
    console.log('   ✓ Essential files are present');
    console.log('   ✓ Required assets are present');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION FAILED');
    console.error('');
    
    if (!sizeCheckPassed) {
      console.error('   ✗ VSIX size exceeds 10MB limit');
    }
    
    if (!forbiddenCheckPassed) {
      console.error('   ✗ Forbidden paths found (node_modules or @mermaid-js/mermaid-cli)');
    }
    
    if (!essentialFilesPassed) {
      console.error(`   ✗ ${missingFiles.length} essential file(s) missing:`);
      missingFiles.forEach(file => console.error(`     - ${file}`));
    }
    
    if (!assetsPassed) {
      console.error(`   ✗ ${missingAssets.length} required asset(s) missing:`);
      missingAssets.forEach(asset => console.error(`     - ${asset}`));
    }
    
    console.error('');
    console.error('   Please check:');
    console.error('   1. Run "npm run compile" to bundle dependencies with esbuild');
    console.error('   2. Verify .vscodeignore excludes node_modules/**');
    console.error('   3. Verify .vscodeignore does NOT exclude dist/ or assets/');
    console.error('   4. Verify package.json uses --no-dependencies flag');
    console.error('   5. Verify @mermaid-js/mermaid-cli is removed from dependencies');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the verification
main();
