$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts V1 - Fix 4" -ForegroundColor Cyan
Write-Host " Durable wallet persistence + migration" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "lib\account\account-profile-store.ts"
$Source = Join-Path $PSScriptRoot "package-files\lib\account\account-profile-store.ts.source"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}

if (-not (Test-Path $Target)) {
    throw "Target file not found: $Target"
}

if (-not (Test-Path $Source)) {
    throw "Package source file not found: $Source"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix4-$Timestamp"
$BackupTarget = Join-Path $BackupRoot "lib\account"

New-Item -ItemType Directory -Force -Path $BackupTarget | Out-Null
Copy-Item $Target (Join-Path $BackupTarget "account-profile-store.ts") -Force

Write-Host "[1/5] Backup created:" -ForegroundColor Green
Write-Host "      $BackupRoot"

Copy-Item $Source $Target -Force
Write-Host "[2/5] Installed durable V2 account profile store." -ForegroundColor Green

Write-Host "[3/5] Clearing Next.js build cache..." -ForegroundColor Yellow
if (Test-Path (Join-Path $ProjectRoot ".next")) {
    Remove-Item (Join-Path $ProjectRoot ".next") -Recurse -Force
}

Write-Host "[4/5] Running production build..." -ForegroundColor Yellow
& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring the previous store..." -ForegroundColor Red
    Copy-Item (Join-Path $BackupTarget "account-profile-store.ts") $Target -Force
    throw "Build failed. Previous file restored."
}

Write-Host "[5/5] Build passed." -ForegroundColor Green
Write-Host ""
Write-Host "Fix 4 applied successfully." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT TEST" -ForegroundColor Cyan
Write-Host "1. Run: npm.cmd run dev"
Write-Host "2. Connect your normal wallet."
Write-Host "3. Open /account -> Saved wallets."
Write-Host "4. Add a second VALID 42-character EVM wallet."
Write-Host "5. Confirm it appears in the Saved wallets list immediately."
Write-Host "6. Refresh the browser."
Write-Host "7. Reconnect the SAME wallet if needed."
Write-Host "8. Confirm the second wallet is still present."
Write-Host ""
Write-Host "Do NOT commit until this test passes." -ForegroundColor Yellow
