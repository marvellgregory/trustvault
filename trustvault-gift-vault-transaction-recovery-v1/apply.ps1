$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-gift-vault-transaction-recovery-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

if (-not (Test-Path $SourceRoot)) {
    throw "Package files were not found at: $SourceRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\gift-vault-transaction-recovery-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$relativeFiles = @(
    "lib\gift-vault\create-gift.ts",
    "components\gift-vault\hooks\useGiftVaultTransaction.ts",
    "components\gift-vault\GiftVaultFlow.tsx"
)

Write-Host "[1/5] Backup created:" -ForegroundColor Cyan
Write-Host $BackupRoot

foreach ($relative in $relativeFiles) {
    $target = Join-Path $Root $relative

    if (-not (Test-Path $target)) {
        throw "Expected current TrustVault file not found: $relative"
    }

    $backup = Join-Path $BackupRoot $relative
    $backupDir = Split-Path $backup -Parent
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Copy-Item $target $backup -Force
}

Write-Host "[2/5] Current transaction files backed up." -ForegroundColor Green

foreach ($relative in $relativeFiles) {
    $source = Join-Path $SourceRoot $relative
    $target = Join-Path $Root $relative

    if (-not (Test-Path $source)) {
        throw "Missing package file: $relative"
    }

    Copy-Item $source $target -Force
}

Write-Host "[3/5] Transaction recovery layer installed." -ForegroundColor Green

$nextDir = Join-Path $Root ".next"
if (Test-Path $nextDir) {
    Remove-Item $nextDir -Recurse -Force
}

Write-Host "[4/5] Cleared .next cache." -ForegroundColor Green
Write-Host "[5/5] Running production build..." -ForegroundColor Cyan

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Backups are at: $BackupRoot"
}

Write-Host ""
Write-Host "BUILD PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Transaction Recovery V1 installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "- Do NOT create Gift #4."
Write-Host "- Existing Gifts #1-#3 are already onchain."
Write-Host "- Start the dev server and verify that /gift-vault renders normally."
Write-Host "- We will use an existing gift for recipient claim testing next."
