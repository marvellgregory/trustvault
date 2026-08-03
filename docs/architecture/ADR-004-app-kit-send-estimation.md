# ADR-004: App Kit Send Estimation

## Status

Accepted for the Arc Testnet Gift Vault flow.

## Decision

TrustVault estimates every App Kit Send before allowing the user to proceed to
the transaction request.

The estimation service:

1. Verifies Arc Testnet is selected.
2. Validates the connected and recipient addresses.
3. Prevents accidental self-sends.
4. Validates a positive USDC amount with up to six decimal places.
5. Reuses the already-connected EIP-6963 wallet.
6. Calls `AppKit.estimateSend()`.
7. Returns serializable fee and gas information for the review interface.

## Safety boundary

This service never calls `AppKit.send()`. It does not move USDC, request token
approval, or create a transaction prompt.

## Fee formatting

Arc uses native USDC for gas with 18 decimal places. The service preserves the
raw fee and also returns a human-readable USDC estimate.
