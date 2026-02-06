#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build automation script for SO Workspace VSCode extension
.DESCRIPTION
    This script automates the complete build, package, and installation process for the extension.
    It runs npm install, compiles TypeScript, packages the VSIX, and installs it in VSCode.
.EXAMPLE
    .\build-extension.ps1
#>

param()

$ErrorActionPreference = "Stop"

# Get the extension directory (parent of scripts folder)
$ExtensionDir = Split-Path -Parent $PSScriptRoot
$OriginalLocation = Get-Location

try {
    # Change to extension directory
    Set-Location $ExtensionDir
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "SO Workspace Extension Build Automation" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Install dependencies
    Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
    try {
        npm install
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # Step 2: Compile TypeScript
    Write-Host "[2/4] Compiling TypeScript..." -ForegroundColor Yellow
    try {
        npm run compile
        Write-Host "✓ TypeScript compiled successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to compile TypeScript" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # Step 3: Package extension
    Write-Host "[3/4] Packaging extension..." -ForegroundColor Yellow
    try {
        npm run package
        
        # Find the generated VSIX file
        $VsixFiles = Get-ChildItem -Path $ExtensionDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
        if ($VsixFiles.Count -eq 0) {
            throw "No VSIX file found after packaging"
        }
        
        $VsixFile = $VsixFiles[0].FullName
        Write-Host "✓ Extension packaged successfully: $($VsixFiles[0].Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to package extension" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # Step 4: Install extension
    Write-Host "[4/4] Installing extension in VSCode..." -ForegroundColor Yellow
    try {
        # Check if 'code' command is available
        $CodeCommand = Get-Command code -ErrorAction SilentlyContinue
        if (-not $CodeCommand) {
            throw "VSCode 'code' command not found in PATH. Please ensure VSCode is installed and added to PATH."
        }
        
        # Uninstall existing version (if any)
        Write-Host "  Uninstalling existing version (if any)..." -ForegroundColor Gray
        & code --uninstall-extension so-vsix 2>$null
        
        # Install the new version
        Write-Host "  Installing new version..." -ForegroundColor Gray
        & code --install-extension $VsixFile --force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Extension installed successfully" -ForegroundColor Green
        }
        else {
            throw "VSCode returned exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Host "✗ Failed to install extension" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "" -ForegroundColor Yellow
        Write-Host "Note: If VSCode is currently running, you may need to:" -ForegroundColor Yellow
        Write-Host "  1. Close all VSCode windows" -ForegroundColor Yellow
        Write-Host "  2. Run this script again" -ForegroundColor Yellow
        Write-Host "  3. Or manually install: code --install-extension $VsixFile" -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
    
    # Success summary
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Reload VSCode window (Ctrl+R or Cmd+R)" -ForegroundColor White
    Write-Host "  2. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)" -ForegroundColor White
    Write-Host "  3. Search for 'SO:' commands to verify installation" -ForegroundColor White
    Write-Host ""
    
    exit 0
}
catch {
    Write-Host "" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Restore original location
    Set-Location $OriginalLocation
}
