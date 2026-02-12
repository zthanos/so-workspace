#!/usr/bin/env node

/**
 * VSIX Build Verification Script
 * 
 * This script verifies that the built VSIX package contains all required assets.
 * It checks for the presence of the assets/ folder and critical asset files.
 * 
 * Usage: node scripts/verify-vsix-contents.js [vsix-file-path]
 * 
 * Exit codes:
 *   0 - Verification passed
 *   1 - Verification failed (missing assets)
 *   2 - VSIX file not found or invalid
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Optional assets to check (warnings only)
const OPTIONAL_ASSETS = [
  'extension/assets/agent/Commands',
  'extension/assets/templates/document_template.html',
  'extension/assets/templates/pdf-styles.css'
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
  
  // Check optional assets (warnings only)
  console.log('\n📋 Checking optional assets...\n');
  for (const asset of OPTIONAL_ASSETS) {
    const exists = checkAssetExists(extractDir, asset);
    if (exists) {
      console.log(`✅ ${asset}`);
    } else {
      console.warn(`⚠️  Optional asset not found: ${asset}`);
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
  
  // Extract VSIX to temp directory
  const extractDir = path.join(__dirname, '..', '.vsix-verify-temp');
  if (!extractVsix(vsixPath, extractDir)) {
    process.exit(2);
  }
  
  // Verify assets
  const { allPassed, missingAssets } = verifyAssets(extractDir);
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  fs.rmSync(extractDir, { recursive: true, force: true });
  
  // Report results
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ VERIFICATION PASSED');
    console.log('   All required assets are present in the VSIX package.');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION FAILED');
    console.error(`   ${missingAssets.length} required asset(s) missing:`);
    missingAssets.forEach(asset => console.error(`   - ${asset}`));
    console.error('\n   Please check:');
    console.error('   1. The assets/ folder exists in the repository root');
    console.error('   2. The .vscodeignore file does not exclude assets/**');
    console.error('   3. All required files exist in assets/');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the verification
main();
