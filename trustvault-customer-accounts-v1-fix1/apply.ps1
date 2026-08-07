param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path $ProjectRoot).Path

function Backup-File([string]$relative, [string]$backupRoot) {
  $target = Join-Path $ProjectRoot $relative
  if (-not (Test-Path $target)) {
    throw "Target file missing: $relative"
  }
  $backup = Join-Path $backupRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $backup -Parent) | Out-Null
  Copy-Item $target $backup -Force
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $ProjectRoot ".trustvault-backups\customer-accounts-fix1-$timestamp"

$hubRel = "components\account\CustomerAccountHub.tsx"
$walletRel = "components\wallet\WalletButton.tsx"

Backup-File $hubRel $backupRoot
Backup-File $walletRel $backupRoot

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# --- CustomerAccountHub.tsx ---
$hubPath = Join-Path $ProjectRoot $hubRel
$hub = [System.IO.File]::ReadAllText($hubPath)

# 1) Persist wallet immediately after valid add.
$oldAdd = @'
    setProfile({
      ...profile,
      wallets: [
        ...profile.wallets,
        {
          id: createSavedWalletId(),
          label:
            newWalletLabel.trim() ||
            "Saved wallet",
          address: walletAddress,
          primary: false,
          connected: false,
          addedAt: new Date().toISOString(),
        },
      ],
    });

    setNewWalletLabel("");
    setNewWalletAddress("");
    setSavedMessage(
      "Wallet added — save your profile to keep it",
    );
'@

$newAdd = @'
    const updatedProfile: CustomerAccountProfile = {
      ...profile,
      wallets: [
        ...profile.wallets,
        {
          id: createSavedWalletId(),
          label:
            newWalletLabel.trim() ||
            "Saved wallet",
          address: walletAddress,
          primary: false,
          connected: false,
          addedAt: new Date().toISOString(),
        },
      ],
    };

    const saved =
      saveCustomerAccountProfile(
        updatedProfile,
      );

    setProfile(saved);
    setNewWalletLabel("");
    setNewWalletAddress("");
    setSavedMessage(
      "Wallet saved to My Account",
    );
'@

if (-not $hub.Contains($oldAdd)) {
  throw "Could not locate addSavedWallet block. Stop to avoid unsafe patching."
}
$hub = $hub.Replace($oldAdd, $newAdd)

# 2) Persist removal immediately.
$oldRemove = @'
                  onClick={() =>
                    onProfileChange({
                      ...profile,
                      wallets: profile.wallets.filter(
                        (item) => item.id !== wallet.id,
                      ),
                    })
                  }
'@

$newRemove = @'
                  onClick={() => {
                    const updatedProfile: CustomerAccountProfile = {
                      ...profile,
                      wallets: profile.wallets.filter(
                        (item) => item.id !== wallet.id,
                      ),
                    };

                    const saved =
                      saveCustomerAccountProfile(
                        updatedProfile,
                      );

                    onProfileChange(saved);
                  }}
'@

if (-not $hub.Contains($oldRemove)) {
  throw "Could not locate saved-wallet removal block. Stop to avoid unsafe patching."
}
$hub = $hub.Replace($oldRemove, $newRemove)

# 3) Add anchor id to daily check-in section for platform-wide link.
$oldSection = '<section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">'
$newSection = '<section id="daily-check-in" className="scroll-mt-28 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">'
$sectionIndex = $hub.IndexOf($oldSection)
if ($sectionIndex -lt 0) {
  throw "Could not locate daily check-in section."
}
$hub = $hub.Remove($sectionIndex, $oldSection.Length).Insert($sectionIndex, $newSection)

# 4) Improve validation message and help text.
$hub = $hub.Replace(
  '"Enter a valid wallet address",',
  '"Enter a full 42-character wallet address beginning with 0x",'
)

$oldHelp = @'
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
'@
$newHelp = @'
        <p className="mt-3 text-xs leading-6 text-zinc-500">
          Paste the complete 42-character EVM wallet address. Saving a wallet here only stores a reference; it never grants signing access.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
'@
# replace only first occurrence after "Add wallet reference"
$anchor = '          Add wallet reference'
$anchorIndex = $hub.IndexOf($anchor)
if ($anchorIndex -ge 0) {
  $helpIndex = $hub.IndexOf($oldHelp, $anchorIndex)
  if ($helpIndex -ge 0) {
    $hub = $hub.Remove($helpIndex, $oldHelp.Length).Insert($helpIndex, $newHelp)
  }
}

[System.IO.File]::WriteAllText($hubPath, $hub, $utf8NoBom)

# --- WalletButton.tsx ---
$walletPath = Join-Path $ProjectRoot $walletRel
$wallet = [System.IO.File]::ReadAllText($walletPath)

$oldAccountLink = @'
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              My Account
            </Link>
'@

$newAccountLink = @'
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              My Account
            </Link>

            <Link
              href="/account#daily-check-in"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mt-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
            >
              <span className="flex items-center gap-3">
                <UserRound aria-hidden="true" className="h-4 w-4" />
                Daily check-in
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                +5
              </span>
            </Link>
'@

if (-not $wallet.Contains($oldAccountLink)) {
  throw "Could not locate My Account link in WalletButton.tsx."
}
$wallet = $wallet.Replace($oldAccountLink, $newAccountLink)

[System.IO.File]::WriteAllText($walletPath, $wallet, $utf8NoBom)

Write-Host ""
Write-Host "Customer Accounts Fix 1 applied." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "git restore next-env.d.ts"
Write-Host "npm.cmd run build"
