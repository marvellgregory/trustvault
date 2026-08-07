# TrustVault Customer Accounts V1

This package introduces the customer-account foundation requested for the TrustVault build.

## Included

- `/account` customer account hub
- Account overview
- Marketplace order history
- Saved receipts
- Saved wallet references
- Profile settings
- Saved addresses with default shipping/billing flags
- TrustPoints dashboard
- Seven-day daily check-in cycle
- 5 points per day
- Day 7 = 5 daily points + 25 bonus points
- Missed day restarts the cycle at Day 1
- After Day 7, the next eligible day starts a new Day 1 cycle
- Transparent prototype Trust Score
- Wallet dropdown → My Account navigation

## Trust Score note

The Trust Score is intentionally described as a **TrustVault activity score**.
It is not presented as a credit score, risk score, identity verification result, or
financial eligibility score.

## Storage

For this prototype, profile, saved address, wallet-reference and daily-check-in
state are browser-local and keyed to the connected wallet. Marketplace order,
receipt and confirmed TrustPoints data continue to come from TrustVault's
existing repositories.

## Apply

Extract this folder directly under the TrustVault project root, then run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\trustvault-customer-accounts-v1\apply.ps1
```

Then:

```powershell
git restore next-env.d.ts
npm.cmd run build
```

If the build succeeds:

```powershell
npm.cmd run dev
```

Open the connected-wallet menu and select **My Account**.

## Test

1. Account Overview loads.
2. Existing Marketplace orders appear.
3. Existing/new receipts appear.
4. TrustPoints Marketplace balance appears.
5. Daily check-in awards 5 points.
6. Day 7 UI clearly shows +30 total (5 + 25 streak bonus).
7. Profile saves.
8. Add a Home address and mark it default shipping/billing.
9. Saved wallet reference can be added and removed.
10. Wallet dropdown contains My Account.

## Next package

The next account package will connect the saved default shipping/billing address
into Marketplace Checkout and feed the saved customer profile directly into
future receipts.
