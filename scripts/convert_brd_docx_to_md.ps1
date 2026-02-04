param(
  [Parameter(Mandatory=$true)][string]$InputDocx,
  [Parameter(Mandatory=$true)][string]$OutputMd
)

$ErrorActionPreference = "Stop"

if (!(Get-Command pandoc -ErrorAction SilentlyContinue)) {
  throw "pandoc not found. Install from https://pandoc.org/installing.html"
}

$outDir = Split-Path $OutputMd -Parent
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($OutputMd)
$assetsDir = Join-Path $outDir "assets\$baseName"

New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

pandoc `
  "$InputDocx" `
  -f docx `
  -t gfm `
  --extract-media="$assetsDir" `
  -o "$OutputMd"

Write-Host "OK: $InputDocx → $OutputMd"
