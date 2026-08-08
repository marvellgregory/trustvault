# TrustVault Customer Accounts V1 — Fix 5

## Root cause addressed

The Saved Wallets screen had two independent persistence actions:

1. **Add wallet** — already wrote the updated profile to storage.
2. **Save wallet list** — immediately wrote the `profile` object held by the current React render.

Because React state updates are asynchronous, clicking the second button immediately after adding a wallet could save the older one-wallet profile over the newly persisted two-wallet profile.

That made the UI report success before refresh, while the next reload returned to the older wallet list.

## What Fix 5 changes

- Removes the redundant **Save wallet list** button.
- Removes the wallet tab's second save callback entirely.
- Renames the single action to **Add & save wallet**.
- Keeps the existing atomic `addSavedWallet()` persistence path.
- Keeps the Profile Settings **Save profile** flow unchanged.
- Keeps Fix 4's durable V2 storage layer unchanged.
- Creates a backup before editing.
- Clears `.next`.
- Runs the production build.
- Automatically restores the UI file if the build fails.

## Apply

Stop the development server first with `Ctrl+C`, then from the TrustVault root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-v1-fix5\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

## Critical test

Add the second wallet using **only** `Add & save wallet`.

Do not perform another save action. There will no longer be a second wallet-save button.

Refresh, reconnect the same wallet if necessary, then confirm the saved reference remains.

Do not commit until that test passes.
