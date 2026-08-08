# TrustVault Gift Vault Transaction Recovery V1

This patch hardens the timed Gift Vault transaction lifecycle after live testing
showed that Arc RPC rate limits could occur after a real transaction had already
been broadcast.

## Critical behavior

A Gift Vault transaction hash is now persisted immediately after `writeContract`
returns, before any receipt polling begins.

If receipt confirmation is temporarily unavailable, TrustVault enters:

`confirmation-pending`

instead of:

`error`

The primary "Lock Gift" action is disabled while an existing transaction is
pending. The user gets:

- the existing transaction hash
- Open on ArcScan
- Retry confirmation

Retry confirmation never calls `createGift()` again.

USDC approval transactions also receive a separate pending-confirmation state.

## Apply

Extract this folder into the TrustVault repository root, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-gift-vault-transaction-recovery-v1\apply.ps1
```

Do not create another test gift after installation. First confirm the recovery UI
and use the already-created gifts for claim testing.
