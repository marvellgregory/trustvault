$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " TrustVault Receipt Center V2" -ForegroundColor Cyan
Write-Host " Search + Filters + Ledger + Mobile states" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "components\receipts\ReceiptCenter.tsx"
$Source = Join-Path $PSScriptRoot "package-files\components\receipts\ReceiptCenter.tsx.source"

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
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\receipt-center-v2-$Timestamp"
$BackupDir = Join-Path $BackupRoot "components\receipts"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$BackupFile = Join-Path $BackupDir "ReceiptCenter.tsx"
Copy-Item $Target $BackupFile -Force

Write-Host "[1/6] Complete ReceiptCenter backup created:" -ForegroundColor Green
Write-Host "      $BackupFile"

Copy-Item $Source $Target -Force
Write-Host "[2/6] Receipt Center V2 complete file installed." -ForegroundColor Green

Write-Host "[3/6] Checking source diff..." -ForegroundColor Yellow
& git diff --check -- $Target
if ($LASTEXITCODE -ne 0) {
    Copy-Item $BackupFile $Target -Force
    throw "git diff --check failed. Original ReceiptCenter.tsx restored."
}

Write-Host "[4/6] Clearing Next.js cache..." -ForegroundColor Yellow
$NextDir = Join-Path $ProjectRoot ".next"
if (Test-Path $NextDir) {
    Remove-Item $NextDir -Recurse -Force
}

Write-Host "[5/6] Running production build..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring ReceiptCenter.tsx..." -ForegroundColor Red
    Copy-Item $BackupFile $Target -Force
    throw "Build failed. Previous ReceiptCenter.tsx restored."
}

Write-Host "[6/6] BUILD PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Receipt Center V2 installed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "TEST MATRIX" -ForegroundColor Cyan
Write-Host "A. Start: npm.cmd run dev"
Write-Host "B. Open /receipts and confirm saved receipts load."
Write-Host "C. Search using receipt ID, merchant/title, or transaction hash."
Write-Host "D. Test Type, Status, and Date filters."
Write-Host "E. Reset filters."
Write-Host "F. Open a real receipt; route must be /receipt/[id]."
Write-Host "G. Open the ... menu; Copy receipt ID must work."
Write-Host "H. If receipt has explorerUrl, ArcScan action must appear."
Write-Host "I. Resize browser to mobile width; rows must stack without horizontal page scrolling."
Write-Host "J. Use an impossible search and confirm the no-results state."
Write-Host ""
Write-Host "Do not click Clear local history unless you intentionally want to delete browser-saved receipts." -ForegroundColor Yellow
Write-Host "Do not commit until A-J pass." -ForegroundColor Yellow
