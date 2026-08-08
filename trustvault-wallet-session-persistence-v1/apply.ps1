$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " TrustVault Wallet Session Persistence V1" -ForegroundColor Cyan
Write-Host " Wagmi SSR cookie hydration + reconnect on mount" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}

$Files = @(
    @{
        Target = "lib\web3\config.ts"
        Source = "package-files\lib\web3\config.ts.source"
    },
    @{
        Target = "app\providers.tsx"
        Source = "package-files\app\providers.tsx.source"
    },
    @{
        Target = "app\layout.tsx"
        Source = "package-files\app\layout.tsx.source"
    }
)

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\wallet-session-persistence-$Timestamp"

Write-Host "[1/7] Creating complete backups..." -ForegroundColor Yellow

foreach ($File in $Files) {
    $Target = Join-Path $ProjectRoot $File.Target
    $Source = Join-Path $PSScriptRoot $File.Source

    if (-not (Test-Path $Target)) {
        throw "Target file not found: $Target"
    }

    if (-not (Test-Path $Source)) {
        throw "Package source not found: $Source"
    }

    $Backup = Join-Path $BackupRoot $File.Target
    $BackupDir = Split-Path $Backup -Parent
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item $Target $Backup -Force
}

Write-Host "      $BackupRoot" -ForegroundColor Green

Write-Host "[2/7] Installing Wagmi cookie-backed storage..." -ForegroundColor Yellow

foreach ($File in $Files) {
    $Target = Join-Path $ProjectRoot $File.Target
    $Source = Join-Path $PSScriptRoot $File.Source
    Copy-Item $Source $Target -Force
}

Write-Host "[3/7] Verifying source diff..." -ForegroundColor Yellow

& git diff --check -- `
    "lib/web3/config.ts" `
    "app/providers.tsx" `
    "app/layout.tsx"

if ($LASTEXITCODE -ne 0) {
    foreach ($File in $Files) {
        Copy-Item `
            (Join-Path $BackupRoot $File.Target) `
            (Join-Path $ProjectRoot $File.Target) `
            -Force
    }
    throw "git diff --check failed. Original files restored."
}

Write-Host "[4/7] Clearing Next.js cache..." -ForegroundColor Yellow
$NextDir = Join-Path $ProjectRoot ".next"
if (Test-Path $NextDir) {
    Remove-Item $NextDir -Recurse -Force
}

Write-Host "[5/7] Running production build..." -ForegroundColor Yellow
& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring original wallet infrastructure..." -ForegroundColor Red

    foreach ($File in $Files) {
        Copy-Item `
            (Join-Path $BackupRoot $File.Target) `
            (Join-Path $ProjectRoot $File.Target) `
            -Force
    }

    throw "Build failed. Original files restored."
}

Write-Host "[6/7] BUILD PASSED." -ForegroundColor Green
Write-Host "[7/7] Wallet session persistence installed." -ForegroundColor Green
Write-Host ""
Write-Host "TEST:" -ForegroundColor Cyan
Write-Host "1. npm.cmd start"
Write-Host "2. Open http://localhost:3000"
Write-Host "3. Connect MetaMask once."
Write-Host "4. Navigate Marketplace -> Account -> Receipts -> Marketplace."
Write-Host "5. Confirm wallet stays connected during navigation."
Write-Host "6. Press Ctrl+R on /account."
Write-Host "7. Confirm wallet reconnects automatically without clicking Connect."
Write-Host "8. Close the tab."
Write-Host "9. Open http://localhost:3000 again."
Write-Host "10. Confirm the last wallet reconnects automatically."
Write-Host ""
Write-Host "A brief reconnecting state is acceptable. Manual reconnect is not." -ForegroundColor Yellow
Write-Host "Do not commit until all checks pass." -ForegroundColor Yellow
