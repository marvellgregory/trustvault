param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
  throw "ProjectRoot does not look like TrustVault: $ProjectRoot"
}

$targets = @(
  "app\account\page.tsx",
  "components\account\CustomerAccountHub.tsx",
  "components\wallet\WalletButton.tsx",
  "lib\account\account-profile-store.ts",
  "lib\account\daily-checkin-store.ts",
  "lib\account\trust-score.ts"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-$timestamp"

Write-Host ""
Write-Host "TrustVault Customer Accounts V1" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray
Write-Host ""

foreach ($relative in $targets) {
  $source = Join-Path $SourceRoot ($relative + ".source")
  $target = Join-Path $ProjectRoot $relative

  if (-not (Test-Path $source)) {
    throw "Package source missing: $relative"
  }

  if (Test-Path $target) {
    $backup = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path $backup -Parent) | Out-Null
    Copy-Item $target $backup -Force
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
  Copy-Item $source $target -Force

  Write-Host "Applied: $relative" -ForegroundColor Green
}

Write-Host ""
Write-Host "Backup location:" -ForegroundColor Yellow
Write-Host $backupRoot
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "npm.cmd run build"
