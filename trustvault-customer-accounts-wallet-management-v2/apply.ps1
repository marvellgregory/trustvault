$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts - Wallet Management V2" -ForegroundColor Cyan
Write-Host " Default + Rename + Confirmed Remove + UX polish" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "components\account\CustomerAccountHub.tsx"
$ReplacementFile = Join-Path $PSScriptRoot "WalletsTab.v2.tsx.txt"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}

if (-not (Test-Path $Target)) {
    throw "Target file not found: $Target"
}

if (-not (Test-Path $ReplacementFile)) {
    throw "WalletsTab V2 source not found: $ReplacementFile"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\wallet-management-v2-$Timestamp"
$BackupDir = Join-Path $BackupRoot "components\account"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$BackupFile = Join-Path $BackupDir "CustomerAccountHub.tsx"
Copy-Item $Target $BackupFile -Force

Write-Host "[1/7] Complete component backup created:" -ForegroundColor Green
Write-Host "      $BackupFile"

$content = Get-Content -Raw -Path $Target

if ($content -notmatch 'function\s+WalletsTab\s*\(') {
    throw "WalletsTab was not found. No production file was changed."
}

if ($content -notmatch 'function\s+ProfileTab\s*\(') {
    throw "ProfileTab was not found. No production file was changed."
}

Write-Host "[2/7] Current account component verified." -ForegroundColor Green

$walletStart = $content.IndexOf("function WalletsTab")
$profileStart = $content.IndexOf("function ProfileTab")

if ($walletStart -lt 0 -or $profileStart -lt 0 -or $profileStart -le $walletStart) {
    throw "Could not establish WalletsTab boundaries. No production file was changed."
}

$beforeWallet = $content.Substring(0, $walletStart)
$afterWallet = $content.Substring($profileStart)
$replacement = Get-Content -Raw -Path $ReplacementFile

$newContent =
    $beforeWallet +
    $replacement.TrimEnd() +
    [Environment]::NewLine +
    $afterWallet

if ($newContent -notmatch 'Make default') {
    throw "Safety check failed: Make default action missing."
}

if ($newContent -notmatch 'Save name') {
    throw "Safety check failed: Rename save action missing."
}

if ($newContent -notmatch 'Default vs connected') {
    throw "Safety check failed: wallet-state explanation missing."
}

if ($newContent -match 'Save wallet list') {
    throw "Safety check failed: stale Save wallet list action returned."
}

if ($newContent -notmatch 'function\s+ProfileTab\s*\(') {
    throw "Safety check failed: ProfileTab would be lost."
}

[System.IO.File]::WriteAllText(
    $Target,
    $newContent,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "[3/7] Complete WalletsTab V2 installed." -ForegroundColor Green

Write-Host "[4/7] Verifying git diff target..." -ForegroundColor Yellow
& git diff --check -- $Target
if ($LASTEXITCODE -ne 0) {
    Copy-Item $BackupFile $Target -Force
    throw "git diff --check failed. Original component restored."
}

Write-Host "[5/7] Clearing Next.js cache..." -ForegroundColor Yellow
$NextDir = Join-Path $ProjectRoot ".next"
if (Test-Path $NextDir) {
    Remove-Item $NextDir -Recurse -Force
}

Write-Host "[6/7] Running production build..." -ForegroundColor Yellow
& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring complete component..." -ForegroundColor Red
    Copy-Item $BackupFile $Target -Force
    throw "Build failed. Previous CustomerAccountHub.tsx restored."
}

Write-Host "[7/7] BUILD PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Wallet Management V2 installed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "TEST MATRIX" -ForegroundColor Cyan
Write-Host "A. Existing saved wallets are still present."
Write-Host "B. Click Make default on the second wallet."
Write-Host "C. Refresh; confirm the new Default badge survives."
Write-Host "D. Rename that wallet; refresh; confirm the nickname survives."
Write-Host "E. Make the connected wallet default again if desired."
Write-Host "F. Remove a wallet that is neither Default nor Connected."
Write-Host "G. Cancel the confirmation once, then confirm removal."
Write-Host "H. Refresh and verify removal persists."
Write-Host ""
Write-Host "Do not commit until A-H pass." -ForegroundColor Yellow
