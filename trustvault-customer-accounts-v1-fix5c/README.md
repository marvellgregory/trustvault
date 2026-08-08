# TrustVault Customer Accounts V1 — Fix 5C

Fix 5 and Fix 5B failed because their patchers tried to match formatting inside a large TSX component.

Fix 5C does not match the button markup.

It:
- makes a complete backup of `CustomerAccountHub.tsx`;
- identifies `WalletsTab` and `ProfileTab` by function names;
- replaces the entire `WalletsTab` function as one known block;
- removes only the `onSave={saveProfileChanges}` prop from the WalletsTab invocation;
- leaves Profile Settings and its Save Profile action intact;
- removes the redundant `Save wallet list` action;
- uses a single `Add & save wallet` action;
- adds a Connected badge;
- adds confirmation before removing a saved wallet;
- clears `.next`;
- runs `npm.cmd run build`;
- restores the complete original component automatically if the build fails.

## Run

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-v1-fix5c\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

Do not commit until add -> refresh -> reconnect -> saved wallet persistence passes.
