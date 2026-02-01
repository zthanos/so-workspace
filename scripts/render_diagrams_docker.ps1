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

function To-PosixPath([string]$winPath) {
  return ($winPath -replace '\\','/')
}

function Find-WorkspaceRoot([string]$startDir) {
  $d = (Resolve-Path $startDir).Path
  for ($i = 0; $i -lt 8; $i++) {
    if (Test-Path (Join-Path $d "docs\00_index.md")) { return $d }
    $parent = Split-Path $d -Parent
    if ($parent -eq $d -or [string]::IsNullOrWhiteSpace($parent)) { break }
    $d = $parent
  }
  throw "Cannot locate workspace root (expected docs\00_index.md)."
}

Write-Host "== Render diagrams (Docker) =="

Assert-Docker

$workspaceRoot = Find-WorkspaceRoot $PSScriptRoot
$mountSpec = "${workspaceRoot}:/work"

$srcRoot = Join-Path $workspaceRoot "docs\03_architecture\diagrams\src"
$outRoot = Join-Path $workspaceRoot "docs\03_architecture\diagrams\out"

if (-not (Test-Path $srcRoot)) {
  throw "No src folder found at $srcRoot"
}

Ensure-Dir $outRoot

$mermaidFiles = Get-ChildItem -Path $srcRoot -Recurse -File -Filter "*.mmd"
$pumlFiles    = Get-ChildItem -Path $srcRoot -Recurse -File -Filter "*.puml"

if (($mermaidFiles.Count + $pumlFiles.Count) -eq 0) {
  Write-Host "No .mmd or .puml files found under $srcRoot. Nothing to render."
  exit 0
}

# Mermaid (.mmd -> .png)
foreach ($f in $mermaidFiles) {
  $relFromRoot = $f.FullName.Substring($workspaceRoot.Length).TrimStart("\")
  $relFromSrc  = $f.FullName.Substring($srcRoot.Length).TrimStart("\")
  $outAbs      = Join-Path $outRoot ([IO.Path]::ChangeExtension($relFromSrc, ".png"))

  Ensure-Dir (Split-Path $outAbs -Parent)

  $inPosix  = "/work/" + (To-PosixPath $relFromRoot)
  $outPosix = "/work/" + (To-PosixPath ($outAbs.Substring($workspaceRoot.Length).TrimStart("\")))

  Write-Host ("Mermaid: {0} -> {1}" -f $relFromRoot, ($outAbs.Substring($workspaceRoot.Length).TrimStart("\")))

  docker run --rm `
    -v $mountSpec `
    minlag/mermaid-cli `
    -i $inPosix `
    -o $outPosix `
    --scale 2 `
    --quiet

  if ($LASTEXITCODE -ne 0) { throw "Mermaid render failed for $($f.FullName)" }
}

# PlantUML (.puml -> .png)
foreach ($f in $pumlFiles) {
  $relFromRoot = $f.FullName.Substring($workspaceRoot.Length).TrimStart("\")
  $relFromSrc  = $f.FullName.Substring($srcRoot.Length).TrimStart("\")
  $outAbs      = Join-Path $outRoot ([IO.Path]::ChangeExtension($relFromSrc, ".png"))

  Ensure-Dir (Split-Path $outAbs -Parent)

  $inPosix     = "/work/" + (To-PosixPath $relFromRoot)
  $outDirPosix = "/work/" + (To-PosixPath ((Split-Path $outAbs -Parent).Substring($workspaceRoot.Length).TrimStart("\")))

  Write-Host ("PlantUML: {0} -> {1}" -f $relFromRoot, ($outAbs.Substring($workspaceRoot.Length).TrimStart("\")))

  docker run --rm `
    -v $mountSpec `
    -w /work `
    plantuml/plantuml `
    -tpng `
    $inPosix `
    -o $outDirPosix

  if ($LASTEXITCODE -ne 0) { throw "PlantUML render failed for $($f.FullName)" }
}

Write-Host "== Done rendering diagrams =="
