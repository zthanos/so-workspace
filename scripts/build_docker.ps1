param()

$ErrorActionPreference = "Stop"

Write-Host "== Build (Docker): Render diagrams + Export PDF =="

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "render_diagrams_docker.ps1")
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "export_pdf_docker.ps1")

Write-Host "== Build completed =="
