param()

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function Assert-Docker() {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCmd) { throw "Missing 'docker'. Install Docker Desktop and ensure it's running." }
  docker info | Out-Null
}

function Find-WorkspaceRoot([string]$startDir) {
  $d = (Resolve-Path $startDir).Path
  for ($i = 0; $i -lt 8; $i++) {
    if (Test-Path (Join-Path $d "docs\manifest.yml")) { return $d }
    $parent = Split-Path $d -Parent
    if ($parent -eq $d -or [string]::IsNullOrWhiteSpace($parent)) { break }
    $d = $parent
  }
  throw "Cannot locate workspace root (expected docs\manifest.yml)."
}

Write-Host "== Export PDF with Docker =="

Assert-Docker

$workspaceRoot = Find-WorkspaceRoot $PSScriptRoot
$mountSpec = "${workspaceRoot}:/work"

Ensure-Dir (Join-Path $workspaceRoot "docs\build\pdf")
Ensure-Dir (Join-Path $workspaceRoot "docs\build\tmp")

$manifest = Join-Path $workspaceRoot "docs\manifest.yml"
$tmpHtml  = "docs/build/tmp/full_doc.html"
$tmpHtmlForPdf = "docs/full_doc.html"
$outPdf   = "docs/build/pdf/Full_Doc.pdf"

# Read manifest.yml with a minimal parser:
# Expect:
# title: "..."
# inputs:
#   - path
#   - path
$title = "Solution Outline"
$inputs = @()

Get-Content $manifest | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^title:\s*"?(.+?)"?$') {
    $title = $Matches[1].Trim('"')
  }
  if ($line -match '^-+\s*(.+)$') {
    $inputs += $Matches[1].Trim()
  }
}

if ($inputs.Count -eq 0) { throw "No inputs found in docs/manifest.yml" }

Write-Host ("Manifest title: {0}" -f $title)
Write-Host ("Inputs: {0}" -f ($inputs -join ", "))

# 1) Markdown -> HTML (put a copy at docs/full_doc.html so relative img paths resolve)
docker run --rm `
  -v $mountSpec `
  -w /work `
  pandoc/core `
  $inputFiles `
  --from markdown+yaml_metadata_block+link_attributes `
  --toc --toc-depth=3 `
  --metadata "title=$title" `
  --resource-path="docs;docs/03_architecture/diagrams/out" `
  --standalone `
  -o "docs/full_doc.html"

if ($LASTEXITCODE -ne 0) { throw "Pandoc HTML generation failed." }

# Optional: keep a copy in tmp as well (nice for debugging)
docker run --rm `
  -v $mountSpec `
  -w /work `
  pandoc/core `
  $inputFiles `
  --from markdown+yaml_metadata_block+link_attributes `
  --toc --toc-depth=3 `
  --metadata "title=$title" `
  --resource-path="docs;docs/03_architecture/diagrams/out" `
  --standalone `
  -o "docs/build/tmp/full_doc.html"

# 2) HTML -> PDF
docker run --rm `
  -v $mountSpec `
  -w /work `
  surnet/alpine-wkhtmltopdf:3.20.2-0.12.6-full `
  --enable-local-file-access `
  --print-media-type `
  --encoding utf-8 `
  "docs/full_doc.html" `
  "docs/build/pdf/Full_Doc.pdf"

if ($LASTEXITCODE -ne 0) { throw "wkhtmltopdf PDF generation failed." }


Write-Host "PDF generated: $outPdf"
