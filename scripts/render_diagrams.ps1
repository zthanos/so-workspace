param()

$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function Assert-Docker() {
  $p = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $p) { throw "Missing docker. Install Docker Desktop and ensure it's running." }
}

Assert-Docker

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$srcRoot  = Join-Path $repoRoot "docs\03_architecture\diagrams\src"
$outRoot  = Join-Path $repoRoot "docs\03_architecture\diagrams\out"

Ensure-Dir $outRoot

Write-Host "== Render diagrams with Docker =="

# --- Mermaid (mmdc) ---
# Image: minlag/mermaid-cli is widely used for mmdc
$mermaidFiles = Get-ChildItem -Path $srcRoot -Recurse -File -Filter "*.mmd"
foreach ($f in $mermaidFiles) {
  $rel = $f.FullName.Substring($repoRoot.Path.Length + 1)
  $outRel = $rel.Replace("\diagrams\src\", "\diagrams\out\").Replace(".mmd", ".png")
  $outPath = Join-Path $repoRoot $outRel
  Ensure-Dir (Split-Path $outPath -Parent)

  Write-Host ("Mermaid: {0} -> {1}" -f $rel, $outRel)

  docker run --rm `
    -v "$($repoRoot.Path):/work" `
    minlag/mermaid-cli `
    -i "/work/$($rel -replace '\\','/')" `
    -o "/work/$($outRel -replace '\\','/')" `
    --scale 2
}

# --- PlantUML ---
# Image: plantuml/plantuml supports rendering; we will call it per file
$pumlFiles = Get-ChildItem -Path $srcRoot -Recurse -File -Filter "*.puml"
foreach ($f in $pumlFiles) {
  $rel = $f.FullName.Substring($repoRoot.Path.Length + 1)
  $outRelDir = (Split-Path ($rel.Replace("\diagrams\src\", "\diagrams\out\")) -Parent)
  Ensure-Dir (Join-Path $repoRoot $outRelDir)

  Write-Host ("PlantUML: {0} -> {1}" -f $rel, $outRelDir)

  # plantuml container can output to a directory; we set working dir to /work
  docker run --rm `
    -v "$($repoRoot.Path):/work" `
    -w /work `
    plantuml/plantuml `
    -tpng "/work/$($rel -replace '\\','/')" `
    -o "/work/$($outRelDir -replace '\\','/')"
}

Write-Host "== Done =="
