$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-bill-split-payment-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\bill-split-payment-v1-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$relativeFiles = @(
    "components\bill-split\types.ts",
    "components\bill-split\pay\BillSplitPaymentView.tsx",
    "components\bill-split\manage\BillSplitDetail.tsx",
    "lib\bill-split\bill-repository.ts",
    "lib\bill-split\payment-config.ts",
    "lib\bill-split\payment-recovery.ts",
    "lib\bill-split\pay-participant-share.ts"
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

Write-Host "[2/5] Existing Bill Split payment files backed up." -ForegroundColor Green

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

Write-Host "[3/5] Bill Split Payment V1 installed." -ForegroundColor Green

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
Write-Host "Bill Split Payment V1 installed." -ForegroundColor Green
Write-Host ""
Write-Host "SAFE TEST ORDER:" -ForegroundColor Yellow
Write-Host "1. npm.cmd run dev"
Write-Host "2. Open the existing bill management page"
Write-Host "3. Confirm the organizer's own participant becomes Self-settled"
Write-Host "4. Open ONE non-organizer participant payment link"
Write-Host "5. Connect that exact participant wallet"
Write-Host "6. Check USDC balance"
Write-Host "7. Confirm the displayed amount and organizer wallet"
Write-Host "8. Pay the share on Arc Testnet"
Write-Host "9. If confirmation times out, DO NOT pay again; use Retry confirmation"
Write-Host "10. Verify Paid state and ArcScan before testing another participant"
