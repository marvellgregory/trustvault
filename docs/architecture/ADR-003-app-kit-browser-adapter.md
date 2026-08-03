# ADR-003: Circle App Kit Browser-Wallet Adapter

## Status

Accepted for the Arc Testnet implementation.

## Decision

TrustVault keeps wallet connection and App Kit operations as separate actions:

1. Wagmi connects the user's browser wallet.
2. TrustVault displays and validates the connected account and network.
3. Only after an explicit payment action does TrustVault discover the selected
   wallet with EIP-6963.
4. Circle's Viem adapter is created from the already-authorized provider.
5. App Kit estimates and executes the requested operation after review.

## Safety boundaries

- TrustVault never receives a private key or recovery phrase.
- Adapter creation does not send funds.
- The helper reads `eth_accounts`; it does not silently call
  `eth_requestAccounts`.
- The App Kit address must match the Wagmi-connected address.
- Every money-moving operation requires an explicit user action and wallet
  approval.
- A transaction is not presented as confirmed until chain confirmation is
  verified.

## Planned consumers

- Gift Vault: App Kit Send, then escrow-backed time lock.
- Bill Split: App Kit Send.
- Marketplace: payment engine plus escrow.
- TrustVault Global: Bridge, Unified Balance, and Swap.
- Atlas: explanation and orchestration only, with explicit user approval.
