# Copy docs/itch-description.md body to clipboard and open the itch edit page.
# itch.io has no metadata API and Cloudflare blocks Playwright — paste manually in your browser.
param(
  [switch]$NoBrowser,
  [switch]$Short
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Source = Join-Path $Root 'docs\itch-description.md'
$EditUrl = 'https://itch.io/game/edit/852727'

if (-not (Test-Path $Source)) {
  Write-Error "Missing $Source"
}

$raw = Get-Content -Path $Source -Raw -Encoding UTF8

if ($Short) {
  if ($raw -notmatch '(?ms)^## Short description\s*\r?\n\r?\n(.+?)\r?\n\r?\n## ') {
    Write-Error 'docs/itch-description.md: missing ## Short description section'
  }
  $body = $Matches[1].Trim()
  Set-Clipboard -Value $body
  Write-Host ''
  Write-Host 'Copied itch.io SHORT description to clipboard.'
  Write-Host ''
  Write-Host 'Paste into Edit game -> Short description, then Save.'
} else {
  $parts = $raw -split '(?m)^---\s*$'
  if ($parts.Count -lt 2) {
    Write-Error 'docs/itch-description.md: missing --- body marker'
  }
  $body = $parts[-1].Trim()
  Set-Clipboard -Value $body
  Write-Host ''
  Write-Host 'Copied itch.io LONG description to clipboard.'
  Write-Host ''
  Write-Host 'Next:'
  Write-Host '  1. Open Edit game (your normal browser, already logged in)'
  Write-Host '  2. Select all text in the Description field (Ctrl+A)'
  Write-Host '  3. Paste (Ctrl+V) and click Save'
}
Write-Host ''

if (-not $NoBrowser) {
  Start-Process $EditUrl
  Write-Host "Opened $EditUrl"
}
