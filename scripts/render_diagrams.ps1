# "param()

# $ErrorActionPreference = "Stop"

# function Ensure-Dir($path) {
#   if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
# }

# function Find-WorkspaceRoot([string]$startDir) {
#   $d = (Resolve-Path $startDir).Path
#   for ($i = 0; $i -lt 8; $i++) {
#     if (Test-Path (Join-Path $d "docs\00_index.md")) { return $d }
#     $parent = Split-Path $d -Parent
#     if ($parent -eq $d -or [string]::IsNullOrWhiteSpace($parent)) { break }
#     $d = $parent
#   }
#   throw "Cannot locate workspace root (expected docs\00_index.md)."
# }

# Write-Host "== Render diagrams (Node.js - No Docker) =="
# $workspaceRoot = Find-WorkspaceRoot $PSScriptRoot
# $srcRoot = Join-Path $workspaceRoot "docs\03_architecture\diagrams\src"
# $outRoot = Join-Path $workspaceRoot "docs\03_architecture\diagrams\out"

# Ensure-Dir $outRoot

# # 1. Mermaid Rendering (Native Node)
# # For now, we'll skip mermaid processing in this implementation as it requires mmdc which is not available here
# # We could add a simple mermaid processing later if needed

# # 2. PlantUML C4 Rendering (Wasm)
# $pumlFiles = Get-ChildItem -Path $srcRoot -Recurse -File -Filter "*.puml"
# foreach ($f in $pumlFiles) {
#   $relFromSrc = $f.FullName.Substring($srcRoot.Length).TrimStart("\")
#   $outAbsDir = Split-Path (Join-Path $outRoot $relFromSrc) -Parent
#   Ensure-Dir $outAbsDir
#   Write-Host "PlantUML (Wasm): $($f.Name)"
  
#   # Call the Node helper script that uses plantuml-wasm
#   node $PSScriptRoot\..\tools\so-vsix\scripts\puml-render.js $f.FullName $outAbsDir
# }

# Write-Host "== Done rendering diagrams =="