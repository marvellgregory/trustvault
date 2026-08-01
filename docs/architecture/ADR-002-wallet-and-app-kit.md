# ADR-002: Wallet and App Kit Architecture

## Decision

TrustVault uses Wagmi and Viem for browser-wallet connection state, then Circle
App Kit with `@circle-fin/adapter-viem-v2` for payment operations.

## Safety boundaries

- No private keys or recovery phrases enter TrustVault.
- No transaction begins without a clear user action.
- Every payment receives a review screen.
- The wallet remains the signer.
- Success is shown only after confirmed transaction state.
- Receipts show a transaction hash and explorer link.

## Arc feature priorities

1. App Kit Send for Gift Vault and Bill Split.
2. Escrow for marketplace checkout.
3. Atlas plus Arc agent tooling for approval-based orchestration.
4. Bridge and Unified Balance as seamless funding rails.
5. Swap after the core flows are stable.
