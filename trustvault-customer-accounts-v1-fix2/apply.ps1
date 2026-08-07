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
  "components\account\CustomerAccountHub.tsx",
  "components\wallet\WalletButton.tsx",
  "lib\account\account-profile-store.ts"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix2-$timestamp"

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
  Write-Host "Updated: $relative" -ForegroundColor Green
}

Write-Host ""
Write-Host "Customer Accounts persistence fix applied." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "git restore next-env.d.ts"
Write-Host "npm.cmd run build"
