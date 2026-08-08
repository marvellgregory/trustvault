# TrustVault Gift Vault Center V1

Adds a product-level Gift Vault history experience on top of the already tested
and deployed timed Gift Vault contract.

## Adds

- `/gift-vault/manage`
- Sent Gifts tab
- Received Gifts tab
- direct contract reconciliation
- Locked / Claimable / Claimed status
- exact unlock display
- direct link to `/gift-vault/claim/[id]`
- ArcScan access
- empty/loading/error states
- Gift Vault Center entry point on `/gift-vault`

## Discovery model

V1 reads `nextGiftId()` and reconciles the most recent 100 gifts directly from
the verified Arc Testnet contract, then filters them against the connected wallet.

That is intentionally simple and trustworthy for the current testnet build.
A production indexing service can replace scanning later while leaving the smart
contract as the source of truth.

## Apply

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-gift-vault-center-v1\apply.ps1
```

Do not create another gift just to test this center. Existing Gifts #1-#3 are
enough to validate the experience.
