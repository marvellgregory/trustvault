# TrustVault Receipt Center V2

Starting checkpoint: `9b69369`

This package translates the approved Gemini Design Lead handoff into TrustVault's existing receipt architecture.

## Production behavior
- Uses the existing `browserReceiptStore`.
- Uses real saved receipt data only.
- Preserves the real detail path: `/receipt/[id]`.
- Does not invent sample merchants, hashes, block numbers, statuses or amounts.
- Shows ArcScan only when an actual `explorerUrl` exists on the receipt.
- Shows TrustPoints only when saved receipt reward data exists.
- Keeps the existing Enterprise Receipt untouched.

## Adds
- Search by receipt ID/display ID, title, merchant/seller, order reference, transaction hash and related saved metadata.
- Type filter: Marketplace, Gift Vault, Bill Split.
- Status filter using existing receipt status values.
- Date filters: 7 / 30 / 90 days.
- Reset filters.
- Premium desktop ledger layout.
- Responsive stacked mobile rows.
- Accessible status badges with icon + text.
- Copy receipt ID context action.
- ArcScan context action only when supported by receipt data.
- Empty Receipt Center state.
- Search/filter no-results state.
- Local browser-storage disclosure.
- Existing clear-history capability retained but moved to a lower-emphasis management area.

## Apply

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-receipt-center-v2\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

Complete the printed test matrix before committing.
