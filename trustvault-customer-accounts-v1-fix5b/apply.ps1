$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " TrustVault Customer Accounts V1 - Fix 5B" -ForegroundColor Cyan
Write-Host " Whitespace-tolerant stale-save race fix" -ForegroundColor Cyan
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
$BackupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix5b-$Timestamp"
$BackupTarget = Join-Path $BackupRoot "components\account"

New-Item -ItemType Directory -Force -Path $BackupTarget | Out-Null
Copy-Item $Target (Join-Path $BackupTarget "CustomerAccountHub.tsx") -Force

Write-Host "[1/7] Backup created:" -ForegroundColor Green
Write-Host "      $BackupRoot"

$content = Get-Content -Raw -Path $Target

if ($content -notmatch 'function\s+WalletsTab\s*\(') {
    throw "WalletsTab was not found. No changes were made."
}

if ($content -notmatch 'Save wallet list') {
    throw "The old Save wallet list control was not found. No changes were made."
}

if ($content -notmatch 'onSave=\{saveProfileChanges\}') {
    throw "The WalletsTab/ProfileTab save wiring was not found. No changes were made."
}

Write-Host "[2/7] Current wallet UI verified." -ForegroundColor Green

# Split the file so edits are limited to the WalletsTab section.
$walletStart = $content.IndexOf("function WalletsTab")
$profileStart = $content.IndexOf("function ProfileTab")

if ($walletStart -lt 0 -or $profileStart -lt 0 -or $profileStart -le $walletStart) {
    throw "Could not determine WalletsTab boundaries. No changes were made."
}

$beforeWallet = $content.Substring(0, $walletStart)
$walletBlock = $content.Substring($walletStart, $profileStart - $walletStart)
$afterWallet = $content.Substring($profileStart)

# Remove parent WalletsTab onSave prop, but preserve ProfileTab onSave.
$beforeWalletUpdated = [regex]::Replace(
    $beforeWallet,
    '(?m)^[ \t]*onSave=\{saveProfileChanges\}\r?\n',
    '',
    1
)

if ($beforeWalletUpdated -eq $beforeWallet) {
    throw "Could not remove WalletsTab onSave parent prop. Original file is unchanged."
}

Write-Host "[3/7] Removed parent stale-save callback." -ForegroundColor Green

# Remove WalletsTab destructured onSave parameter.
$walletBlockUpdated = [regex]::Replace(
    $walletBlock,
    '(?m)^[ \t]*onSave,\r?\n',
    '',
    1
)

# Remove WalletsTab onSave type.
$walletBlockUpdated2 = [regex]::Replace(
    $walletBlockUpdated,
    '(?m)^[ \t]*onSave:\s*\(\)\s*=>\s*void;\r?\n',
    '',
    1
)

# Replace the two-button action area only inside WalletsTab.
$buttonPattern = '(?s)<div className="mt-5 flex flex-wrap gap-2">\s*' +
    '<button\s+type="button"\s+onClick=\{onAdd\}\s+className="[^"]*">\s*' +
    '<Plus className="h-4 w-4"\s*/>\s*Add wallet\s*</button>\s*' +
    '<button\s+type="button"\s+onClick=\{onSave\}\s+className="[^"]*">\s*' +
    '<Save className="h-4 w-4"\s*/>\s*Save wallet list\s*</button>\s*</div>'

$buttonReplacement = @'
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

$walletBlockUpdated3 = [regex]::Replace(
    $walletBlockUpdated2,
    $buttonPattern,
    $buttonReplacement,
    1
)

if ($walletBlockUpdated3 -eq $walletBlockUpdated2) {
    throw "Could not replace the old wallet action buttons. Original file is unchanged."
}

$newContent = $beforeWalletUpdated + $walletBlockUpdated3 + $afterWallet

Write-Host "[4/7] Replaced wallet actions with one atomic save." -ForegroundColor Green

# Safety checks.
if ($newContent -match 'Save wallet list') {
    throw "Verification failed: old Save wallet list text still exists. No file was written."
}

if ($newContent -notmatch 'Add & save wallet') {
    throw "Verification failed: new Add & save wallet action is missing. No file was written."
}

# ProfileTab MUST still have its save callback.
if ($newContent -notmatch 'function\s+ProfileTab[\s\S]*?onSave:\s*\(\)\s*=>\s*void;') {
    throw "Verification failed: Profile Settings save callback would be damaged. No file was written."
}

Set-Content -Path $Target -Value $newContent -Encoding utf8

Write-Host "[5/7] Source written and safety checks passed." -ForegroundColor Green

Write-Host "[6/7] Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path (Join-Path $ProjectRoot ".next")) {
    Remove-Item (Join-Path $ProjectRoot ".next") -Recurse -Force
}

Write-Host "[7/7] Running production build..." -ForegroundColor Yellow
& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Restoring CustomerAccountHub.tsx..." -ForegroundColor Red
    Copy-Item (Join-Path $BackupTarget "CustomerAccountHub.tsx") $Target -Force
    throw "Build failed. Previous CustomerAccountHub.tsx restored."
}

Write-Host ""
Write-Host "Fix 5B applied successfully. Build passed." -ForegroundColor Green
Write-Host ""
Write-Host "TEST:" -ForegroundColor Cyan
Write-Host "  1. npm.cmd run dev"
Write-Host "  2. Connect your normal wallet."
Write-Host "  3. Open /account -> Saved wallets."
Write-Host "  4. Add a second valid EVM address."
Write-Host "  5. Click ONLY 'Add & save wallet'."
Write-Host "  6. Confirm it appears."
Write-Host "  7. Refresh."
Write-Host "  8. Reconnect the SAME wallet if required."
Write-Host "  9. Confirm it remains."
Write-Host ""
Write-Host "Do not commit until this refresh test passes." -ForegroundColor Yellow
