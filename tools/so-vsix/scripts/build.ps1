param()

$ErrorActionPreference = "Stop"

Write-Host "== Build: Render diagrams + Export PDF =="
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "render_diagrams.ps1")
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "export_pdf.ps1")
Write-Host "== Build completed =="
