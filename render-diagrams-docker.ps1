#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Render Structurizr DSL diagrams to SVG using Docker
.DESCRIPTION
    This script uses the Structurizr CLI Docker container to render .dsl files to SVG format.
    It's an alternative to installing Structurizr CLI locally.
.PARAMETER File
    Specific .dsl file to render (optional). If not specified, renders all .dsl files.
.PARAMETER Format
    Output format: svg, png, or dot (default: svg)
.EXAMPLE
    ./render-diagrams-docker.ps1
    Renders all .dsl files to SVG
.EXAMPLE
    ./render-diagrams-docker.ps1 -File c4_context.dsl
    Renders only the context diagram
.EXAMPLE
    ./render-diagrams-docker.ps1 -Format png
    Renders all diagrams to PNG format
#>

param(
    [string]$File = "",
    [ValidateSet("svg", "png", "dot")]
    [string]$Format = "svg"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Err { Write-Host $args -ForegroundColor Red }

Write-Info "=== Structurizr Diagram Rendering (Docker) ==="
Write-Info ""

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Err "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check if structurizr-cli container exists
$cliContainer = docker ps -a --filter "name=structurizr-cli" --format "{{.Names}}"

if ($cliContainer -ne "structurizr-cli") {
    Write-Info "Starting Structurizr CLI container..."
    docker-compose -f docker-compose.structurizr.yml up -d structurizr-cli
    Start-Sleep -Seconds 2
}

# Check if container is running
$running = docker ps --filter "name=structurizr-cli" --format "{{.Names}}"

if ($running -ne "structurizr-cli") {
    Write-Info "Starting Structurizr CLI container..."
    docker-compose -f docker-compose.structurizr.yml start structurizr-cli
    Start-Sleep -Seconds 2
}

Write-Success "Structurizr CLI container is ready"
Write-Info ""

# Determine which files to render
$srcDir = "docs/03_architecture/diagrams/src"
$outDir = "docs/03_architecture/diagrams/out"

if ($File) {
    $files = @($File)
    Write-Info "Rendering: $File"
} else {
    $files = Get-ChildItem -Path $srcDir -Filter "*.dsl" | Select-Object -ExpandProperty Name
    Write-Info "Found $($files.Count) .dsl file(s) to render"
}

if ($files.Count -eq 0) {
    Write-Warning "No .dsl files found in $srcDir"
    exit 0
}

Write-Info ""

# Ensure output directory exists
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# Render each file
$successCount = 0
$failCount = 0

foreach ($dslFile in $files) {
    Write-Info "Rendering: $dslFile -> $Format"
    
    try {
        # Run structurizr.sh export command in Docker
        $result = docker exec structurizr-cli /usr/local/structurizr-cli/structurizr.sh export `
            -workspace "/workspace/src/$dslFile" `
            -format $Format `
            -output /workspace/out 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "  Success: $dslFile"
            $successCount++
        } else {
            Write-Err "  Failed: $dslFile"
            Write-Err "  Error: $result"
            $failCount++
        }
    } catch {
        Write-Err "  Failed: $dslFile"
        Write-Err "  Error: $_"
        $failCount++
    }
}

Write-Info ""
Write-Info "=== Rendering Summary ==="
Write-Success "Successful: $successCount"

if ($failCount -gt 0) {
    Write-Err "Failed: $failCount"
}

Write-Info ""
Write-Info "Output directory: $outDir"

# List generated files
$outputFiles = Get-ChildItem -Path $outDir -Filter "*.$Format" | Select-Object -ExpandProperty Name

if ($outputFiles.Count -gt 0) {
    Write-Info "Generated files:"
    foreach ($outFile in $outputFiles) {
        Write-Success "  - $outFile"
    }
} else {
    Write-Warning "No output files were generated"
}

Write-Info ""
Write-Success "=== Rendering complete ==="
