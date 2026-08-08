$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$PackageRoot = Join-Path $Root "trustvault-bill-split-foundation-v1"
$SourceRoot = Join-Path $PackageRoot "package-files"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this script from the TrustVault repository root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root ".trustvault-backups\bill-split-foundation-v1-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$relativeFiles = @(
    "app\bill-split\page.tsx",
    "app\bill-split\manage\[id]\page.tsx",
    "components\bill-split\BillSplitFlow.tsx",
    "components\bill-split\BillSplitProgress.tsx",
    "components\bill-split\types.ts",
    "components\bill-split\validation.ts",
    "components\bill-split\hooks\useBillSplit.ts",
    "components\bill-split\steps\BillDetailsStep.tsx",
    "components\bill-split\steps\ParticipantsStep.tsx",
    "components\bill-split\steps\SplitMethodStep.tsx",
    "components\bill-split\steps\ReviewStep.tsx",
    "components\bill-split\manage\BillSplitDetail.tsx",
    "lib\bill-split\split-calculator.ts",
    "lib\bill-split\bill-id.ts",
    "lib\bill-split\bill-repository.ts"
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

Write-Host "[2/5] Existing Bill Split files backed up." -ForegroundColor Green

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

Write-Host "[3/5] Bill Split Foundation V1 installed." -ForegroundColor Green

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
Write-Host "Bill Split Foundation V1 installed." -ForegroundColor Green
Write-Host ""
Write-Host "Browser checks:" -ForegroundColor Yellow
Write-Host "1. npm.cmd run dev"
Write-Host "2. Open /bill-split"
Write-Host "3. Connect organizer wallet"
Write-Host "4. Create a test bill with 3 participants"
Write-Host "5. Verify equal split remainder handling"
Write-Host "6. Create the Bill Split"
Write-Host "7. Confirm redirect to /bill-split/manage/<id>"
Write-Host "8. Confirm NO wallet transaction or USDC movement occurs"
