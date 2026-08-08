$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-gift-vault-claim-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\gift-vault-claim-v1-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$relativeFiles = @(
    "lib\gift-vault\gift-display.ts",
    "lib\gift-vault\claim-gift.ts",
    "components\gift-vault\claim\GiftClaimReceipt.tsx",
    "components\gift-vault\claim\GiftClaimView.tsx",
    "app\gift-vault\claim\[id]\page.tsx",
    "components\gift-vault\GiftVaultReceipt.tsx",
    "components\receipts\TransactionReceipt.tsx"
)

Write-Host "[1/5] Backup created:" -ForegroundColor Cyan
Write-Host $BackupRoot

foreach ($relative in $relativeFiles) {
    $target = Join-Path $Root $relative

    if (Test-Path -LiteralPath $target) {
        $backup = Join-Path $BackupRoot $relative
        $backupDir = Split-Path $backup -Parent
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item -LiteralPath $target -Destination $backup -Force
    }
}

Write-Host "[2/5] Existing files backed up." -ForegroundColor Green

foreach ($relative in $relativeFiles) {
    $source = Join-Path $SourceRoot $relative
    $target = Join-Path $Root $relative

    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing package file: $relative"
    }

    $targetDir = Split-Path $target -Parent
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
}

Write-Host "[3/5] Recipient Claim V1 installed." -ForegroundColor Green

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
Write-Host "Gift Vault Claim V1 installed." -ForegroundColor Green
Write-Host ""
Write-Host "Browser checks:" -ForegroundColor Yellow
Write-Host "1. npm.cmd run dev"
Write-Host "2. Open /gift-vault/claim/1"
Write-Host "3. Confirm the gift loads from Arc Testnet."
Write-Host "4. Test wrong-wallet state with the current sender wallet."
Write-Host "5. Do NOT claim until you intentionally connect the recorded recipient wallet."
Write-Host "6. Do NOT create Gift #4."
