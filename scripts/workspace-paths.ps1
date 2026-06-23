# Shared paths for C:\Dev work root + Google Drive staging (source: scripts/*.ps1)
$ErrorActionPreference = 'Stop'

$WorkspacePaths = @{
  WorkRoot      = 'C:\Dev\github-projects'
  DriveStaging  = 'D:\Users\pfaus\Google Drive\github-projects'
  LegacyDrive   = 'D:\Users\pfaus\Google Drive\github-projects'
}

# Folders excluded from gsync / migrate copy (robocopy /XD)
$WorkspaceExcludeDirs = @(
  'node_modules'
  'dist'
  'dist-ssr'
  '.vite'
  'test-results'
  'playwright-report'
  'blob-report'
  'playwright\.cache'
  'coverage'
  '.venv'
  '__pycache__'
  '.turbo'
  '.next'
  'build'
)

function Get-RobocopyExcludeArgs {
  $args = @()
  foreach ($dir in $WorkspaceExcludeDirs) {
    $args += '/XD'
    $args += $dir
  }
  return $args
}
