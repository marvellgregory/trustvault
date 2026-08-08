$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts V1 - Fix 5" -ForegroundColor Cyan
Write-Host " Remove stale wallet-save race condition" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "components\account\CustomerAccountHub.tsx"

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the TrustVault project root."
}

if (-not (Test-Path $Target)) {
    throw "Target file not found: $Target"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix5-$Timestamp"
$BackupTarget = Join-Path $BackupRoot "components\account"

New-Item -ItemType Directory -Force -Path $BackupTarget | Out-Null
Copy-Item $Target (Join-Path $BackupTarget "CustomerAccountHub.tsx") -Force

Write-Host "[1/6] Backup created:" -ForegroundColor Green
Write-Host "      $BackupRoot"

$content = Get-Content -Raw -Path $Target

# Guard: Fix 5 is intended for the current CustomerAccountHub shape.
if ($content -notmatch 'Save wallet list') {
    throw "Expected 'Save wallet list' control was not found. No changes were made."
}

if ($content -notmatch 'onAdd=\{addSavedWallet\}') {
    throw "Expected wallet add handler was not found. No changes were made."
}

Write-Host "[2/6] Current wallet UI shape verified." -ForegroundColor Green

# Remove ONLY the WalletsTab onSave prop from the parent invocation.
$oldInvocation = @'
                onAdd={addSavedWallet}
                onProfileChange={setProfile}
                onSave={saveProfileChanges}
'@

$newInvocation = @'
                onAdd={addSavedWallet}
                onProfileChange={setProfile}
'@

if (-not $content.Contains($oldInvocation)) {
    throw "Could not locate the WalletsTab parent save wiring. No changes were made."
}

$content = $content.Replace($oldInvocation, $newInvocation)

# Remove ONLY WalletsTab's onSave parameter.
$oldWalletParams = @'
  onAdd,
  onProfileChange,
  onSave,
}: {
'@

$newWalletParams = @'
  onAdd,
  onProfileChange,
}: {
'@

if (-not $content.Contains($oldWalletParams)) {
    throw "Could not locate WalletsTab parameter wiring. No changes were made."
}

$content = $content.Replace($oldWalletParams, $newWalletParams)

# Remove ONLY WalletsTab's onSave type. The ProfileTab onSave type remains.
$walletTypeBlock = @'
  onAdd: () => void;
  onProfileChange: (profile: CustomerAccountProfile) => void;
  onSave: () => void;
}) {
'@

$walletTypeReplacement = @'
  onAdd: () => void;
  onProfileChange: (profile: CustomerAccountProfile) => void;
}) {
'@

if (-not $content.Contains($walletTypeBlock)) {
    throw "Could not locate WalletsTab onSave type. No changes were made."
}

$content = $content.Replace($walletTypeBlock, $walletTypeReplacement)

# Replace the two-button wallet save area with one atomic Add Wallet action.
$oldButtons = @'
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add wallet
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            Save wallet list
          </button>
        </div>
'@

$newButtons = @'
        <div className="mt-5">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add & save wallet
          </button>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Wallet references save immediately when added. No second save step is required.
          </p>
        </div>
'@

if (-not $content.Contains($oldButtons)) {
    throw "Could not locate the old two-button wallet action block. No changes were made."
}

$content = $content.Replace($oldButtons, $newButtons)

Set-Content -Path $Target -Value $content -Encoding utf8

Write-Host "[3/6] Removed the stale second-save path." -ForegroundColor Green

# Verify intended end state before building.
$updated = Get-Content -Raw -Path $Target

if ($updated -match 'Save wallet list') {
    Copy-Item (Join-Path $BackupTarget "CustomerAccountHub.tsx") $Target -Force
    throw "Verification failed: stale Save wallet list control still exists. Original restored."
}

if ($updated -notmatch 'Add & save wallet') {
    Copy-Item (Join-Path $BackupTarget "CustomerAccountHub.tsx") $Target -Force
    throw "Verification failed: new atomic wallet action not found. Original restored."
}

Write-Host "[4/6] Source verification passed." -ForegroundColor Green

Write-Host "[5/6] Clearing Next.js cache and running production build..." -ForegroundColor Yellow
if (Test-Path (Join-Path $ProjectRoot ".next")) {
    Remove-Item (Join-Path $ProjectRoot ".next") -Recurse -Force
}

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring CustomerAccountHub.tsx..." -ForegroundColor Red
    Copy-Item (Join-Path $BackupTarget "CustomerAccountHub.tsx") $Target -Force
    throw "Build failed. Previous CustomerAccountHub.tsx restored."
}

Write-Host "[6/6] Build passed." -ForegroundColor Green
Write-Host ""
Write-Host "Fix 5 applied successfully." -ForegroundColor Green
Write-Host ""
Write-Host "TEST EXACTLY THIS WAY:" -ForegroundColor Cyan
Write-Host "  1. npm.cmd run dev"
Write-Host "  2. Connect your normal wallet."
Write-Host "  3. Open /account -> Saved wallets."
Write-Host "  4. Add a valid second EVM address."
Write-Host "  5. Click ONLY 'Add & save wallet'."
Write-Host "  6. Confirm the second wallet appears."
Write-Host "  7. Refresh."
Write-Host "  8. Reconnect the SAME wallet if needed."
Write-Host "  9. Confirm the second wallet remains."
Write-Host ""
Write-Host "There is intentionally NO separate Save wallet list button." -ForegroundColor Yellow
Write-Host "Do not commit until the refresh test passes." -ForegroundColor Yellow
