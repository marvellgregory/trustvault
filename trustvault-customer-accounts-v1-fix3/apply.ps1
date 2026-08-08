$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts V1 - Fix 3" -ForegroundColor Cyan
Write-Host " Saved wallet persistence foundation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "lib\account\account-profile-store.ts"
$Source = Join-Path $PSScriptRoot "package-files\lib\account\account-profile-store.ts.source"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root (the folder containing package.json)."
}

if (-not (Test-Path $Target)) {
    throw "Target file not found: $Target"
}

if (-not (Test-Path $Source)) {
    throw "Package source file not found: $Source"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix3-$Timestamp"
$BackupTarget = Join-Path $BackupRoot "lib\account"

New-Item -ItemType Directory -Force -Path $BackupTarget | Out-Null
Copy-Item $Target (Join-Path $BackupTarget "account-profile-store.ts") -Force

Write-Host "[1/4] Backup created:" -ForegroundColor Green
Write-Host "      $BackupRoot"

Copy-Item $Source $Target -Force

Write-Host "[2/4] Replaced persistence store." -ForegroundColor Green

Write-Host "[3/4] Running Next.js production build..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring original file..." -ForegroundColor Red
    Copy-Item (Join-Path $BackupTarget "account-profile-store.ts") $Target -Force
    throw "Build failed. Original account-profile-store.ts was restored."
}

Write-Host "[4/4] Build passed." -ForegroundColor Green
Write-Host ""
Write-Host "Fix 3 applied successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Browser test:" -ForegroundColor Cyan
Write-Host "  1. npm.cmd run dev"
Write-Host "  2. Open /account"
Write-Host "  3. Open Saved wallets"
Write-Host "  4. Add a second valid EVM wallet address"
Write-Host "  5. Refresh the page"
Write-Host "  6. Confirm the saved wallet is still present"
Write-Host ""
Write-Host "Then run:" -ForegroundColor Cyan
Write-Host "  git status"
Write-Host ""
