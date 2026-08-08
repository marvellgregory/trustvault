# TrustVault Bill Split Foundation V1

Package 1 for Bill Split Production.

## Adds

- real `/bill-split` four-step creation flow
- organizer wallet capture
- participant names + wallet addresses
- equal or custom split
- exact USDC base-unit arithmetic
- deterministic remainder distribution
- persistent browser repository at `trustvault.bill-splits.v1`
- unique `TV-BS-...` bill IDs
- organizer management route `/bill-split/manage/[id]`
- participant obligations and reserved payment links

## Important

No USDC moves in Foundation V1.

Participant payment execution is intentionally deferred to Package 2 so the
calculation, persistence and organizer workflow can be browser-tested first.

## Apply

Extract into the TrustVault repository root and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-bill-split-foundation-v1\apply.ps1
```
