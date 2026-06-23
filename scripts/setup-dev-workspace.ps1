# One-shot: create C:\Dev, migrate from Drive, set GITHUB_PROJECTS, setup MCP for GigaZonk.
param(
  [string] $Source = 'D:\Users\pfaus\Google Drive\github-projects',
  [switch] $SkipMigrate
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\workspace-paths.ps1"

$work = $WorkspacePaths.WorkRoot

Write-Host '=== GigaZonk dev workspace setup ==='

New-Item -ItemType Directory -Force -Path $work | Out-Null

if (-not $SkipMigrate) {
  & "$PSScriptRoot\migrate-to-c-dev.ps1" -Source $Source
}

# Persist GITHUB_PROJECTS for user (optional but recommended)
[Environment]::SetEnvironmentVariable('GITHUB_PROJECTS', $work, 'User')
$env:GITHUB_PROJECTS = $work
Write-Host "GITHUB_PROJECTS=$work (user env updated)"

$giga = Join-Path $work 'GigaZonk'
if (-not (Test-Path $giga)) {
  Write-Warning "GigaZonk not at $giga — clone or migrate first."
  exit 1
}

Push-Location $giga
try {
  if (-not (Test-Path 'node_modules')) {
    Write-Host 'npm install...'
    npm install
  }
  npm run setup:mcp
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Next steps:'
Write-Host "  1. Open Cursor: $giga"
Write-Host '  2. Command Palette -> Dev Containers: Reopen in Container (requires Docker Desktop)'
Write-Host '  3. Reload MCP in Cursor Settings'
Write-Host '  4. In container or host: npm run dev  -> http://localhost:5173'
Write-Host '  5. After commits: npm run gsync  (stage source to Google Drive)'
