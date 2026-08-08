# TrustVault Gift Vault Claim V1

Recipient-side claim experience for the deployed Arc Testnet timed Gift Vault.

## Adds

- `/gift-vault/claim/[id]`
- direct `getGift()` contract reads
- direct `isClaimable()` contract reads
- Locked / Claimable / Wrong Wallet / Claimed states
- recipient-only `claim(giftId)`
- transaction hash persistence immediately after broadcast
- retry-confirmation recovery without duplicate claim submission
- claim receipt
- onchain-enforced receipt messaging
- sender receipt link to recipient claim page

## Safety

Do not create Gift #4.

Use an existing Gift ID for browser testing first.

For a money-moving claim test, connect the exact recipient wallet recorded onchain.

## Apply

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-gift-vault-claim-v1\apply.ps1
```
