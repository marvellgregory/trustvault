$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " TrustVault Onchain Gift Vault V1" -ForegroundColor Cyan
Write-Host " Foundry setup + contract tests" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$SourceRoot = Join-Path $PSScriptRoot "contracts\gift-vault"
$TargetRoot = Join-Path $ProjectRoot "contracts\gift-vault"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}

if (-not (Get-Command forge -ErrorAction SilentlyContinue)) {
    Write-Host "Foundry is not installed or 'forge' is not available in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Foundry first, then reopen the terminal and rerun this script." -ForegroundColor Yellow
    Write-Host "No TrustVault production files were changed."
    exit 2
}

Write-Host "[1/5] Foundry detected:" -ForegroundColor Green
forge --version

if (Test-Path $TargetRoot) {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\onchain-gift-vault-$Timestamp"
    New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
    Copy-Item $TargetRoot (Join-Path $BackupRoot "gift-vault") -Recurse -Force
    Write-Host "[2/5] Existing contract folder backed up:" -ForegroundColor Green
    Write-Host "      $BackupRoot"
    Remove-Item $TargetRoot -Recurse -Force
}
else {
    Write-Host "[2/5] No existing Gift Vault contract folder to back up." -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path (Split-Path $TargetRoot -Parent) | Out-Null
Copy-Item $SourceRoot $TargetRoot -Recurse -Force

Write-Host "[3/5] Contract project installed:" -ForegroundColor Green
Write-Host "      $TargetRoot"

Push-Location $TargetRoot

try {
    if (-not (Test-Path ".\lib\forge-std")) {
        Write-Host "[4/5] Installing forge-std test dependency..." -ForegroundColor Yellow
        forge install foundry-rs/forge-std --no-commit
    }
    else {
        Write-Host "[4/5] forge-std already installed." -ForegroundColor Green
    }

    Write-Host "[5/5] Running contract tests..." -ForegroundColor Yellow
    forge test -vv

    if ($LASTEXITCODE -ne 0) {
        throw "Foundry tests failed."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "ONCHAIN GIFT VAULT V1 TESTS PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Do NOT deploy yet." -ForegroundColor Yellow
Write-Host "Send the full test output back to the Lead Architect first."
