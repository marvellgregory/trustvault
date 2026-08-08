# TrustVault Customer Accounts V1 — Fix 3

Purpose: fix the saved-wallet persistence foundation without changing unrelated TrustVault systems.

This package:
- preserves saved wallet references across reloads;
- separates `primary` (the user's default wallet reference) from `connected` (the wallet currently connected through wagmi);
- keeps exactly one primary wallet;
- deduplicates wallet references by address;
- keeps existing localStorage data where valid;
- adds safe migration behavior for yesterday's profile shape;
- creates a timestamped backup before replacing the file;
- automatically restores the old file if `npm.cmd run build` fails.

## Apply

From the TrustVault project root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-v1-fix3\apply.ps1
```

## Manual browser test

1. `npm.cmd run dev`
2. Connect the same wallet you used yesterday.
3. Open `/account` → **Saved wallets**.
4. Add a second full EVM address.
5. Refresh.
6. Confirm the second wallet remains.
7. Disconnect/reconnect the original wallet.
8. Confirm the saved wallet remains.

Do not commit until the browser test passes.
