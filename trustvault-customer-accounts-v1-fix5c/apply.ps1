$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts V1 - Fix 5C" -ForegroundColor Cyan
Write-Host " Deterministic WalletsTab complete-block replacement" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "components\account\CustomerAccountHub.tsx"
$ReplacementFile = Join-Path $PSScriptRoot "WalletsTab.replacement.tsx.txt"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}
if (-not (Test-Path $Target)) {
    throw "Target not found: $Target"
}
if (-not (Test-Path $ReplacementFile)) {
    throw "Replacement block not found: $ReplacementFile"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix5c-$Timestamp"
$BackupDir = Join-Path $BackupRoot "components\account"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$BackupFile = Join-Path $BackupDir "CustomerAccountHub.tsx"
Copy-Item $Target $BackupFile -Force

Write-Host "[1/7] Full component backup created:" -ForegroundColor Green
Write-Host "      $BackupFile"

$lines = [System.Collections.Generic.List[string]]::new()
Get-Content -Path $Target | ForEach-Object { [void]$lines.Add($_) }

# Locate the WalletsTab invocation in CustomerAccountHub.
$invokeStart = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq '<WalletsTab') {
        $invokeStart = $i
        break
    }
}
if ($invokeStart -lt 0) {
    throw "WalletsTab invocation was not found. Original file remains unchanged."
}

$invokeEnd = -1
for ($i = $invokeStart; $i -lt [Math]::Min($invokeStart + 30, $lines.Count); $i++) {
    if ($lines[$i].Trim() -eq '/>') {
        $invokeEnd = $i
        break
    }
}
if ($invokeEnd -lt 0) {
    throw "WalletsTab invocation end was not found. Original file remains unchanged."
}

# Remove only the stale onSave prop inside WalletsTab invocation.
$removedParentSave = $false
for ($i = $invokeEnd; $i -ge $invokeStart; $i--) {
    if ($lines[$i].Trim() -eq 'onSave={saveProfileChanges}') {
        $lines.RemoveAt($i)
        $invokeEnd--
        $removedParentSave = $true
        break
    }
}
if (-not $removedParentSave) {
    throw "WalletsTab stale onSave prop was not found. Original file remains unchanged."
}

Write-Host "[2/7] Removed only WalletsTab's stale parent save prop." -ForegroundColor Green

# Locate the function block by named function boundaries.
$walletFunctionStart = -1
$profileFunctionStart = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($walletFunctionStart -lt 0 -and $lines[$i].TrimStart().StartsWith('function WalletsTab(')) {
        $walletFunctionStart = $i
        continue
    }

    if ($walletFunctionStart -ge 0 -and $lines[$i].TrimStart().StartsWith('function ProfileTab(')) {
        $profileFunctionStart = $i
        break
    }
}

if ($walletFunctionStart -lt 0 -or $profileFunctionStart -lt 0 -or $profileFunctionStart -le $walletFunctionStart) {
    Copy-Item $BackupFile $Target -Force
    throw "Could not locate WalletsTab/ProfileTab function boundaries. Original restored."
}

$replacementLines = Get-Content -Path $ReplacementFile

# Replace the ENTIRE WalletsTab function, not individual formatting fragments.
$removeCount = $profileFunctionStart - $walletFunctionStart
$lines.RemoveRange($walletFunctionStart, $removeCount)
$lines.InsertRange($walletFunctionStart, [string[]]$replacementLines)

Write-Host "[3/7] Entire WalletsTab function replaced." -ForegroundColor Green

$newContent = $lines -join [Environment]::NewLine

# Safety verification.
if ($newContent -match 'Save wallet list') {
    Copy-Item $BackupFile $Target -Force
    throw "Safety check failed: Save wallet list still exists. Original restored."
}
if ($newContent -notmatch 'Add & save wallet') {
    Copy-Item $BackupFile $Target -Force
    throw "Safety check failed: new atomic add action is missing. Original restored."
}
if ($newContent -notmatch 'function ProfileTab') {
    Copy-Item $BackupFile $Target -Force
    throw "Safety check failed: ProfileTab missing. Original restored."
}
if ($newContent -notmatch 'Save profile') {
    Copy-Item $BackupFile $Target -Force
    throw "Safety check failed: Profile Settings save action missing. Original restored."
}

[System.IO.File]::WriteAllText(
    $Target,
    $newContent + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "[4/7] Full component written; safety verification passed." -ForegroundColor Green

Write-Host "[5/7] Clearing .next cache..." -ForegroundColor Yellow
$NextDir = Join-Path $ProjectRoot ".next"
if (Test-Path $NextDir) {
    Remove-Item $NextDir -Recurse -Force
}

Write-Host "[6/7] Running production build..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring complete CustomerAccountHub.tsx..." -ForegroundColor Red
    Copy-Item $BackupFile $Target -Force
    throw "Build failed. Complete original component restored."
}

Write-Host "[7/7] BUILD PASSED." -ForegroundColor Green
Write-Host ""
Write-Host "Fix 5C is installed." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "  npm.cmd run dev"
Write-Host ""
Write-Host "TEST:" -ForegroundColor Cyan
Write-Host "  1. Connect the same main wallet."
Write-Host "  2. Account -> Saved wallets."
Write-Host "  3. Enter label + valid second 42-character EVM address."
Write-Host "  4. Click 'Add & save wallet' ONCE."
Write-Host "  5. Confirm second wallet appears."
Write-Host "  6. Refresh browser."
Write-Host "  7. Reconnect the SAME main wallet if required."
Write-Host "  8. Return to Saved wallets."
Write-Host "  9. Confirm second wallet remains."
Write-Host ""
Write-Host "DO NOT COMMIT until that exact refresh test passes." -ForegroundColor Yellow
