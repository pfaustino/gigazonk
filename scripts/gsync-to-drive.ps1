# Stage source from C:\Dev\github-projects to Google Drive (cloud upload queue).
# Usage: powershell -File scripts/gsync-to-drive.ps1 [-Repo GigaZonk]
param(
  [string] $Repo = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\workspace-paths.ps1"

$source = $WorkspacePaths.WorkRoot
$dest = $WorkspacePaths.DriveStaging
$excludeArgs = Get-RobocopyExcludeArgs

if (-not (Test-Path $source)) {
  Write-Error "Work root missing: $source - run scripts/migrate-to-c-dev.ps1 first"
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null

if ($Repo) {
  $source = Join-Path $source $Repo
  $dest = Join-Path $dest $Repo
  if (-not (Test-Path $source)) {
    Write-Error "Repo not found: $source"
  }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

Write-Host "gsync: $source -> $dest"

$roboArgs = @(
  $source
  $dest
  '/E'
  '/R:2'
  '/W:2'
  '/NFL'
  '/NDL'
  '/NJH'
  '/NJS'
) + $excludeArgs

& robocopy @roboArgs
$code = $LASTEXITCODE
if ($code -ge 8) {
  Write-Error "robocopy failed with exit code $code"
}

Write-Host 'Drive client will upload staged files to Google cloud.'
