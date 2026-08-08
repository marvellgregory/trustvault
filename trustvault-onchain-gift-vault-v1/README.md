# TrustVault Onchain Gift Vault V1

This is the first real timed-lock smart-contract foundation for Gift Vault.

## Contract behavior

A sender:
1. approves the Gift Vault contract to spend a chosen amount of Arc Testnet USDC;
2. calls `createGift(recipient, amount, unlockTimestamp)`;
3. the contract transfers USDC into the vault and records the sender, recipient, amount and exact UTC Unix unlock timestamp.

The recipient:
- cannot claim before `unlockTimestamp`;
- becomes eligible exactly when `block.timestamp >= unlockTimestamp`;
- is the only wallet allowed to claim;
- cannot claim the same gift twice.

## Important time model

The smart contract does NOT store human time zones.

The TrustVault frontend will later convert:

`local date + local time + IANA timezone`

into one canonical UTC Unix timestamp.

Example:

`12 Aug 2026, 9:00 AM, Asia/Kolkata`
→ canonical UTC instant
→ stored as `unlockTimestamp`

That avoids timezone ambiguity and DST errors.

## Arc Testnet USDC

The deployment script uses the official Arc Testnet USDC ERC-20 interface:

`0x3600000000000000000000000000000000000000`

USDC amounts passed into the contract use **6 decimals**.

For example:
- `1 USDC = 1_000_000`
- `25 USDC = 25_000_000`

Do not mix this with Arc's native gas-token precision.

## Stage 1 only

This package installs and TESTS the contract locally.

It intentionally does **not deploy** yet.

After tests pass, the next controlled stage is:
1. deploy to Arc Testnet;
2. verify on ArcScan;
3. add the deployed contract address to TrustVault environment configuration;
4. connect the Gift Vault UI to approval + createGift;
5. build recipient claim flow.

## Apply

From the TrustVault root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-onchain-gift-vault-v1\apply.ps1
```

If Foundry is missing, the installer stops without changing production code.
