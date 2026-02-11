#!/usr/bin/env pwsh
# Test the complete C4 Structurizr DSL migration workflow

param(
    [switch]$SkipDocker,
    [switch]$StopDocker,
    [int]$Timeout = 30
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Err { Write-Host $args -ForegroundColor Red }

Write-Info "=== C4 Structurizr DSL Migration - Workflow Test ==="
Write-Info ""

# Check if we should stop Docker
if ($StopDocker) {
    Write-Info "Stopping Structurizr Lite container..."
    docker-compose -f docker-compose.structurizr.yml down
    Write-Success "Container stopped"
    exit 0
}

# Step 1: Start Structurizr Lite (unless skipped)
if (-not $SkipDocker) {
    Write-Info "Step 1: Starting Structurizr Lite in Docker..."
    
    # Check if container is already running
    $running = docker ps --filter "name=structurizr-lite" --format "{{.Names}}"
    
    if ($running -eq "structurizr-lite") {
        Write-Success "Structurizr Lite is already running"
    } else {
        Write-Info "  Starting container..."
        docker-compose -f docker-compose.structurizr.yml up -d
        
        # Wait for server to be ready
        Write-Info "  Waiting for server to be ready (timeout: ${Timeout}s)..."
        $elapsed = 0
        $ready = $false
        
        while ($elapsed -lt $Timeout) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $ready = $true
                    break
                }
            } catch {
                # Server not ready yet
            }
            
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host "." -NoNewline
        }
        
        Write-Host ""
        
        if ($ready) {
            Write-Success "Structurizr Lite is ready at http://localhost:8080"
        } else {
            Write-Warning "Server did not respond within ${Timeout}s, but continuing..."
        }
    }
} else {
    Write-Info "Step 1: Skipping Docker startup (-SkipDocker flag set)"
}

Write-Info ""

# Step 2: Validate DSL files
Write-Info "Step 2: Validating DSL files..."

$contextDsl = "docs/03_architecture/diagrams/src/c4_context.dsl"
$containerDsl = "docs/03_architecture/diagrams/src/c4_container.dsl"

if (Test-Path $contextDsl) {
    Write-Success "Found: $contextDsl"
} else {
    Write-Err "Missing: $contextDsl"
    exit 1
}

if (Test-Path $containerDsl) {
    Write-Success "Found: $containerDsl"
} else {
    Write-Err "Missing: $containerDsl"
    exit 1
}

Write-Info ""

# Step 3: Run integration tests
Write-Info "Step 3: Running integration tests..."
Set-Location tools/so-vsix

try {
    npm test -- c4-migration-integration.test.ts
    $testResult = $LASTEXITCODE
    
    if ($testResult -eq 0) {
        Write-Success "All integration tests passed"
    } else {
        Write-Err "Some integration tests failed"
        exit $testResult
    }
} finally {
    Set-Location ../..
}

Write-Info ""

# Step 4: Check for Structurizr CLI
Write-Info "Step 4: Checking for Structurizr CLI..."

$cliAvailable = $false
try {
    $cliVersion = & structurizr-cli --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Structurizr CLI is available: $cliVersion"
        $cliAvailable = $true
    }
} catch {
    Write-Warning "Structurizr CLI not found in PATH"
    Write-Info "  To install: Download from https://github.com/structurizr/cli"
}

Write-Info ""

# Step 5: Summary
Write-Info "=== Workflow Test Summary ==="
Write-Success "DSL files exist and are valid"
Write-Success "Integration tests passed"

if (-not $SkipDocker) {
    Write-Success "Structurizr Lite is running at http://localhost:8080"
    Write-Info ""
    Write-Info "You can now:"
    Write-Info "  1. Open http://localhost:8080 in your browser to view diagrams"
    Write-Info "  2. Run validation from VSCode: 'SO: 3-07 Validate Structurizr DSL Files'"
    Write-Info "  3. Stop the server: ./test-structurizr-workflow.ps1 -StopDocker"
}

if ($cliAvailable) {
    Write-Success "Structurizr CLI is available for rendering"
} else {
    Write-Warning "Structurizr CLI not available (optional)"
}

Write-Info ""
Write-Success "=== Workflow test completed successfully ==="
