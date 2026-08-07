# TrustVault Customer Accounts V1 — Fix 2

This is a targeted persistence correction based on the live account test.

## Fixes
- Add Wallet now writes the updated wallet list to browser storage immediately.
- Removing a wallet persists immediately.
- Saved profile storage deduplicates wallet references.
- The connected wallet is always kept as the primary/connected wallet.
- Clearer full-wallet validation message.
- Wallet menu now includes `Daily check-in +5`.
- Daily check-in menu item links directly to `/account#daily-check-in`.

## Apply
Extract under the TrustVault root and run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\trustvault-customer-accounts-v1-fix2\apply.ps1
git restore next-env.d.ts
npm.cmd run build
```

After a clean build:

```powershell
npm.cmd run dev
```

## Test
1. Wallet menu shows `Daily check-in +5`.
2. My Account → Saved wallets.
3. Add a valid full EVM address (`0x` + 40 hexadecimal characters).
4. Navigate to Overview, then back to Saved wallets.
5. Refresh the browser and confirm the wallet still exists.
6. Remove the wallet.
7. Navigate away, return, refresh, and confirm it stays removed.
