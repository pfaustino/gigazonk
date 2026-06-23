# Install workspace extension recommendations (Cursor or VS Code CLI).
param(
  [switch] $Force
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Join-Path $root '.vscode\extensions.json'

if (-not (Test-Path $manifest)) {
  Write-Error "Missing $manifest"
}

$ids = (Get-Content $manifest -Raw | ConvertFrom-Json).recommendations
$cli = $null
foreach ($candidate in @('cursor', 'code')) {
  if (Get-Command $candidate -ErrorAction SilentlyContinue) {
    $cli = $candidate
    break
  }
}

if (-not $cli) {
  Write-Error 'Neither cursor nor code CLI found on PATH.'
}

Write-Host "Installing $($ids.Count) extensions via $cli ..."
foreach ($id in $ids) {
  $args = @('--install-extension', $id)
  if ($Force) { $args += '--force' }
  & $cli @args
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to install $id (exit $LASTEXITCODE)"
  }
}

Write-Host 'Done. Reload the editor window to activate new extensions.'
