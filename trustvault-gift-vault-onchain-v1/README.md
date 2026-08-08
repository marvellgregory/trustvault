# TrustVault Gift Vault Onchain V1

This patch upgrades the existing five-step Gift Vault sender flow to the verified
Arc Testnet timed Gift Vault contract.

Canonical Arc Testnet contract:
0x98a85fc032A985E3A267573Cce57378C464fFB86

Arc Testnet USDC interface:
0x3600000000000000000000000000000000000000

## What changes

- exact unlock date + time + timezone
- canonical UTC Unix timestamp conversion
- explicit onchain unlock preview
- USDC balance + allowance check
- exact-amount USDC approval when required
- createGift(recipient, amount, unlockTimestamp)
- wait for Arc confirmation
- parse GiftCreated event for real onchain Gift ID
- receipt updated to show locked state, Gift ID, block and contract address
- old direct-recipient App Kit Gift Vault send path is no longer used by the timed flow

## What does NOT change

- Marketplace payment flow
- global wallet persistence
- existing Circle App Kit modules
- deployed Solidity contract
- Arc/Circle brand hierarchy

## Apply

From the TrustVault root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-gift-vault-onchain-v1\apply.ps1
```

The installer backs up each replaced file and runs a production build.

Do not commit until browser tests pass.
