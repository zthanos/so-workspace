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

Write-Host "== Export PDF with Enhanced TOC =="

Assert-Docker

$workspaceRoot = Find-WorkspaceRoot $PSScriptRoot
Write-Host "Workspace root: $workspaceRoot"

$mountSpec = "${workspaceRoot}:/work"

Ensure-Dir (Join-Path $workspaceRoot "docs\build\pdf")
Ensure-Dir (Join-Path $workspaceRoot "docs\build\tmp")

# Create custom CSS file if it doesn't exist
$cssPath = Join-Path $workspaceRoot "docs\build\pdf-style.css"
if (-not (Test-Path $cssPath)) {
  Write-Host "Creating custom CSS..."
  
  $cssContent = @'
/* Custom CSS for PDF Export */
@page { size: A4; margin: 20mm 15mm; }

body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  line-height: 1.6;
  color: #333;
  font-size: 11pt;
}

h1.title {
  font-size: 32pt;
  text-align: center;
  margin-top: 100px;
  margin-bottom: 50px;
  color: #2c3e50;
  page-break-after: always;
}

#TOC {
  page-break-after: always;
  border: 1px solid #ddd;
  padding: 20px;
  background-color: #f9f9f9;
}

#TOC::before {
  content: "Document Map";
  display: block;
  font-size: 24pt;
  font-weight: bold;
  margin-bottom: 20px;
  color: #2c3e50;
}

#TOC ul { list-style: none; padding-left: 0; }
#TOC li { margin: 8px 0; }
#TOC ul ul { padding-left: 20px; }
#TOC a { text-decoration: none; color: #2c3e50; }

h1 {
  font-size: 22pt;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-top: 30px;
  page-break-before: always;
  page-break-after: avoid;
}

h2 {
  font-size: 16pt;
  color: #34495e;
  margin-top: 25px;
  page-break-after: avoid;
}

h3 {
  font-size: 13pt;
  color: #7f8c8d;
  margin-top: 20px;
  page-break-after: avoid;
}

p { orphans: 3; widows: 3; }

pre {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  page-break-inside: avoid;
  font-size: 9pt;
}

code {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 90%;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
  page-break-inside: avoid;
  font-size: 10pt;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #3498db;
  color: white;
}

tr:nth-child(even) { background-color: #f9f9f9; }

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 20px auto;
  page-break-inside: avoid;
}

ul, ol {
  margin: 10px 0;
  padding-left: 30px;
}

li { margin: 5px 0; }
'@
  
  $cssContent | Out-File -FilePath $cssPath -Encoding UTF8
  Write-Host "  Created: $cssPath" -ForegroundColor Green
}

$manifest = Join-Path $workspaceRoot "docs\manifest.yml"
$outPdf   = "docs/build/pdf/Full_Doc.pdf"

# Read manifest.yml
$title = "Solution Outline"
$inputs = @()

Get-Content $manifest | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^title:\s*"?(.+?)"?$') {
    $title = $Matches[1].Trim('"')
  }
  if ($line -match '^\s*-\s+(.+)$') {
    $inputs += $Matches[1].Trim()
  }
}

if ($inputs.Count -eq 0) { throw "No inputs found in docs/manifest.yml" }

Write-Host ("Manifest title: {0}" -f $title)
Write-Host ("Inputs: {0}" -f ($inputs -join ", "))

# Validate files
Write-Host "`nValidating input files..."
$missingFiles = @()
foreach ($inputPath in $inputs) {
  $fullPath = Join-Path $workspaceRoot $inputPath
  if (-not (Test-Path $fullPath)) {
    $missingFiles += $inputPath
    Write-Host "  [MISSING] $inputPath" -ForegroundColor Red
  } else {
    Write-Host "  [OK] $inputPath" -ForegroundColor Green
  }
}

if ($missingFiles.Count -gt 0) {
  throw "Missing input files - cannot proceed"
}

Write-Host "`nGenerating HTML with custom styling..."

# Build Pandoc command
$dockerArgs = @(
  'run', '--rm', '-v', $mountSpec, '-w', '/work', 'pandoc/core'
)

foreach ($input in $inputs) {
  $dockerArgs += $input
}

$dockerArgs += '--from', 'markdown+yaml_metadata_block+link_attributes'
$dockerArgs += '--toc', '--toc-depth=3', '--number-sections'
$dockerArgs += '--metadata', "title=$title"
$dockerArgs += '--resource-path=docs;docs/03_architecture/diagrams/out'
$dockerArgs += '--css=build/pdf-style.css', '--self-contained'
$dockerArgs += '--standalone', '-o', 'docs/full_doc.html'

& docker $dockerArgs
if ($LASTEXITCODE -ne 0) { throw "Pandoc HTML generation failed." }

Write-Host "HTML generated successfully"

# Copy to tmp
$dockerArgsTmp = @(
  'run', '--rm', '-v', $mountSpec, '-w', '/work', 'pandoc/core'
)

foreach ($input in $inputs) {
  $dockerArgsTmp += $input
}

$dockerArgsTmp += '--from', 'markdown+yaml_metadata_block+link_attributes'
$dockerArgsTmp += '--toc', '--toc-depth=3', '--number-sections'
$dockerArgsTmp += '--metadata', "title=$title"
$dockerArgsTmp += '--resource-path=docs;docs/03_architecture/diagrams/out'
$dockerArgsTmp += '--css=build/pdf-style.css', '--self-contained'
$dockerArgsTmp += '--standalone', '-o', 'docs/build/tmp/full_doc.html'

& docker $dockerArgsTmp

# Generate PDF with TOC bookmarks
Write-Host "`nGenerating PDF with TOC and bookmarks..."

$dockerPdfArgs = @(
  'run', '--rm', '-v', $mountSpec, '-w', '/work',
  'surnet/alpine-wkhtmltopdf:3.20.2-0.12.6-full',
  '--enable-local-file-access',
  '--print-media-type',
  '--encoding', 'utf-8',
  '--outline', '--outline-depth', '3',
  '--footer-center', '[page] / [topage]',
  '--footer-font-size', '9',
  '--margin-top', '20mm',
  '--margin-bottom', '20mm',
  '--margin-left', '15mm',
  '--margin-right', '15mm',
  'docs/full_doc.html',
  'docs/build/pdf/Full_Doc.pdf'
)

& docker $dockerPdfArgs
if ($LASTEXITCODE -ne 0) { throw "wkhtmltopdf PDF generation failed." }

Write-Host "`n==================================="
Write-Host "PDF generated successfully!" -ForegroundColor Green
Write-Host "Location: $outPdf"
Write-Host "==================================="
Write-Host "`nPDF Features:" -ForegroundColor Cyan
Write-Host "  ✓ Custom styled document" -ForegroundColor Green
Write-Host "  ✓ Table of Contents page" -ForegroundColor Green
Write-Host "  ✓ Numbered sections" -ForegroundColor Green
Write-Host "  ✓ PDF bookmarks/outline (view in sidebar)" -ForegroundColor Green
Write-Host "  ✓ Page numbers in footer" -ForegroundColor Green
Write-Host "  ✓ Images and diagrams included" -ForegroundColor Green