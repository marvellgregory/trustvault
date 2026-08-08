# TrustVault Customer Accounts — Wallet Management V2

Starting checkpoint: `7785f60`

This package completes the remaining Saved Wallet management interactions while preserving the successful Fix 5C persistence architecture.

## Adds

- Make any saved wallet the TrustVault default.
- Persist the selected default across reloads.
- Rename wallet references inline.
- Persist wallet nicknames across reloads.
- Confirm before removing a wallet reference.
- Prevent removal of the current Default wallet.
- Prevent removal of the currently Connected wallet because the active connection would be reconstructed on reload.
- Separate `Default` and `Connected` states clearly.
- Atomic persistence for every wallet management action.
- Clear language that TrustVault stores references only and never private keys or seed phrases.
- Better card hierarchy and interaction polish.

## Apply

From the TrustVault project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-wallet-management-v2\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

Complete the test matrix printed by the installer before committing.
