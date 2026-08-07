# TrustVault Customer Accounts V1 — Fix 1

This fix addresses the issues found during live testing.

## Fixes

- Saved wallet references now persist immediately after a successful Add Wallet action.
- Removing a saved wallet also persists immediately.
- Validation explains that a complete 42-character `0x...` EVM address is required.
- Saved-wallet help copy clarifies that saving a wallet never grants signing authority.
- Adds a platform-wide `Daily check-in +5` entry inside the connected-wallet menu.
- That entry links directly to the Daily Check-in card in My Account.

## Note about the screenshot error

`Enter a valid wallet address` means the entered value did not match a full EVM address:
`0x` + 40 hexadecimal characters.

## Apply

From the TrustVault project root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\trustvault-customer-accounts-v1-fix1\apply.ps1
git restore next-env.d.ts
npm.cmd run build
```

After a clean build:

```powershell
npm.cmd run dev
```

Test:
1. Wallet menu → Daily check-in.
2. Add a full valid wallet address.
3. Leave Saved Wallets and return.
4. Confirm the saved reference remains.
5. Remove it, leave the page, return, and confirm it stays removed.
