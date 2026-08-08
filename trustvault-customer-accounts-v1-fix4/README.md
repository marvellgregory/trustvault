# TrustVault Customer Accounts V1 — Fix 4

This replaces Fix 3's single-record persistence with a durable V2 account store.

## What changes

- Saves each customer profile under a V2 per-wallet key.
- Saves a redundant copy in a V2 account registry.
- Keeps the V1 key synchronized during migration.
- Loads the newest available record from V2 direct storage, the registry, or V1.
- Self-heals recovered records back into the V2 storage locations.
- Preserves saved-wallet labels and references.
- Separates the connected wallet state from the user's primary/default wallet.
- Deduplicates wallet addresses.
- Does not request or store signing authority, private keys, or seed phrases.
- Clears `.next` before building so stale Turbopack output cannot mask the change.
- Restores the previous file automatically if the production build fails.

## Apply

Extract this folder into the TrustVault project root, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-v1-fix4\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

Test add-wallet -> refresh -> reconnect using the same connected wallet.

Do not commit until persistence passes.
