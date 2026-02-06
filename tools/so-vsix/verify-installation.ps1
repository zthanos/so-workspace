#!/usr/bin/env pwsh
# Comprehensive verification script for SO Workspace extension

Write-Host "=== SO Workspace Extension Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check if extension is installed
Write-Host "1. Checking extension installation..." -ForegroundColor Yellow
$installed = code --list-extensions --show-versions | Select-String "so-vsix"
if ($installed) {
    Write-Host "   [OK] Extension installed: $installed" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Extension not installed" -ForegroundColor Red
    exit 1
}

# Check if VSIX file exists
Write-Host ""
Write-Host "2. Checking VSIX package..." -ForegroundColor Yellow
if (Test-Path "so-vsix-1.0.0.vsix") {
    Write-Host "   [OK] VSIX package exists: so-vsix-1.0.0.vsix" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] VSIX package not found" -ForegroundColor Red
}

# Check if compiled files exist
Write-Host ""
Write-Host "3. Checking compiled files..." -ForegroundColor Yellow
$distFiles = @(
    "dist/extension.js",
    "dist/build_open_tasks.js",
    "dist/diagram_renderer.js",
    "dist/diagrams_open_chat.js",
    "dist/objectives_open_chat.js",
    "dist/requirements_open_chat.js",
    "dist/solution_outline_open_chat.js"
)

$allExist = $true
foreach ($file in $distFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] $file missing" -ForegroundColor Red
        $allExist = $false
    }
}

# Run command registration verification
Write-Host ""
Write-Host "4. Verifying command registration..." -ForegroundColor Yellow
$result = node verify-commands.js
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] All commands registered" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Command registration issues detected" -ForegroundColor Red
    Write-Host $result
}

# Summary
Write-Host ""
Write-Host "=== Verification Summary ===" -ForegroundColor Cyan
if ($installed -and $allExist -and $LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open VSCode Command Palette (Ctrl+Shift+P)"
    Write-Host "  2. Type 'SO:' to see all available commands"
    Write-Host "  3. Test 'SO: Diagram Evaluate (Select Diagram)'"
    Write-Host "  4. Test 'SO: Render Diagrams (Local)'"
    exit 0
} else {
    Write-Host "[FAIL] Some checks failed" -ForegroundColor Red
    exit 1
}
