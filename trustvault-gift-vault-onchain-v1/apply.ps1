$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-gift-vault-onchain-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

if (-not (Test-Path $SourceRoot)) {
    throw "Package files were not found at: $SourceRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\gift-vault-onchain-v1-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

Write-Host "[1/5] Backup created:" -ForegroundColor Cyan
Write-Host $BackupRoot

$relativeFiles = @(
    "lib\gift-vault\contract.ts",
    "lib\gift-vault\timezone.ts",
    "lib\gift-vault\create-gift.ts",
    "lib\gift-vault\read-gift.ts",
    "components\gift-vault\types.ts",
    "components\gift-vault\validation.ts",
    "components\gift-vault\hooks\useGiftVault.ts",
    "components\gift-vault\hooks\useGiftVaultTransaction.ts",
    "components\gift-vault\steps\UnlockStep.tsx",
    "components\gift-vault\review\ReviewSummary.tsx",
    "components\gift-vault\review\EstimateCard.tsx",
    "components\gift-vault\steps\ReviewStep.tsx",
    "components\gift-vault\GiftVaultReceipt.tsx",
    "components\gift-vault\GiftVaultFlow.tsx"
)

foreach ($relative in $relativeFiles) {
    $target = Join-Path $Root $relative

    if (Test-Path $target) {
        $backup = Join-Path $BackupRoot $relative
        $backupDir = Split-Path $backup -Parent
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item $target $backup -Force
    }
}

Write-Host "[2/5] Existing files backed up." -ForegroundColor Green

foreach ($relative in $relativeFiles) {
    $source = Join-Path $SourceRoot $relative
    $target = Join-Path $Root $relative

    if (-not (Test-Path $source)) {
        throw "Missing package file: $relative"
    }

    $targetDir = Split-Path $target -Parent
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Copy-Item $source $target -Force
}

Write-Host "[3/5] Onchain Gift Vault integration installed." -ForegroundColor Green

$nextDir = Join-Path $Root ".next"
if (Test-Path $nextDir) {
    Remove-Item $nextDir -Recurse -Force
}

Write-Host "[4/5] Cleared .next cache." -ForegroundColor Green
Write-Host "[5/5] Running production build..." -ForegroundColor Cyan

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Your backups are at: $BackupRoot"
}

Write-Host ""
Write-Host "BUILD PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Gift Vault Onchain V1 installed." -ForegroundColor Green
Write-Host ""
Write-Host "Browser test:" -ForegroundColor Yellow
Write-Host "1. npm.cmd run dev"
Write-Host "2. Open /gift-vault"
Write-Host "3. Confirm Unlock step now has date + time + timezone."
Write-Host "4. Use a FUTURE time at least 10 minutes ahead."
Write-Host "5. Connect the sender wallet on Arc Testnet."
Write-Host "6. Use a different recipient wallet."
Write-Host "7. Use a very small Arc Testnet USDC amount."
Write-Host "8. On Review, click Check vault funding."
Write-Host "9. Click Lock Gift on Arc Testnet."
Write-Host "10. If requested, approve USDC, then confirm createGift."
Write-Host "11. Confirm the result shows a real Gift ID, tx hash, block and vault contract."
Write-Host ""
Write-Host "Do NOT repeat the createGift action if a transaction hash was already produced."
Write-Host "Do NOT commit until the exact browser test passes."
