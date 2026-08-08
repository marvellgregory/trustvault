# TrustVault Bill Split Payment V1

Adds real Arc Testnet USDC participant settlement to Bill Split.

## What this package adds

- exact ERC-20 USDC transfer to the organizer wallet
- Arc Testnet chain validation
- participant-wallet validation
- USDC balance/funding check
- transaction hash persistence immediately after wallet submission
- confirmation retry/recovery after RPC timeout or refresh
- participant Paid state after confirmed receipt
- organizer management state updates
- ArcScan transaction links
- organizer self-share normalization (no meaningless self-transfer)
- transaction receipt display on the participant page

## Important V1 limitation

Bill Split records are still stored in browser localStorage. This package is
for same-browser Arc Testnet lifecycle testing. Cross-device/public shareable
links require shared persistence in a later package.

## Test safely

Use Arc Testnet only. Testnet assets have no real-world value.

For the existing bill shown during development, the organizer's own participant
share will automatically become Self-settled. Test one non-organizer
participant first.
