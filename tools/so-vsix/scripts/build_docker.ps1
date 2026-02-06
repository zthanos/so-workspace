param()

$ErrorActionPreference = "Stop"

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting scripts/build_docker.ps1" -ForegroundColor Yellow
Write-Host "== Build (Docker): Render diagrams + Export PDF =="

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "render_diagrams_docker.ps1")
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "export_pdf_docker.ps1")

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Completed scripts/build_docker.ps1" -ForegroundColor Yellow
Write-Host "== Build completed =="

