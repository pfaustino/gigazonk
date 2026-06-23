# Copy github-projects fleet from Google Drive path to C:\Dev (excludes node_modules, etc.)
# Usage: powershell -File scripts/migrate-to-c-dev.ps1 [-Source <path>] [-WhatIf]
param(
  [string] $Source = 'D:\Users\pfaus\Google Drive\github-projects',
  [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\workspace-paths.ps1"

$dest = $WorkspacePaths.WorkRoot
$excludeArgs = Get-RobocopyExcludeArgs

if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source"
}

Write-Host "Migrate: $Source -> $dest"
Write-Host "Excluding: $($WorkspaceExcludeDirs -join ', ')"

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$roboArgs = @(
  $Source
  $dest
  '/E'
  '/R:2'
  '/W:2'
  '/NFL'
  '/NDL'
  '/NJH'
  '/NJS'
) + $excludeArgs

if ($WhatIf) {
  $roboArgs += '/L'
  Write-Host 'WhatIf: listing files that would copy...'
}

& robocopy @roboArgs
$code = $LASTEXITCODE
if ($code -ge 8) {
  Write-Error "robocopy failed with exit code $code"
}

Write-Host "Done. Set GITHUB_PROJECTS=$dest and open Cursor on $dest\GigaZonk"
Write-Host 'Then: npm run setup:mcp'
