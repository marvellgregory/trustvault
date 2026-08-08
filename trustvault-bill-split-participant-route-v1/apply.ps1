$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-bill-split-participant-route-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\bill-split-participant-route-v1-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$relativeFiles = @(
    "app\bill-split\pay\[billId]\[participantId]\page.tsx",
    "components\bill-split\pay\BillSplitPaymentView.tsx"
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

Write-Host "[2/5] Existing participant route files backed up." -ForegroundColor Green

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

Write-Host "[3/5] Participant payment route installed." -ForegroundColor Green

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
Write-Host "Bill Split participant route installed." -ForegroundColor Green
Write-Host ""
Write-Host "Expected route:" -ForegroundColor Yellow
Write-Host "/bill-split/pay/[billId]/[participantId]"
Write-Host ""
Write-Host "No funds move in this patch."
