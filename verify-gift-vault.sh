#!/usr/bin/env bash
set -e

CAST=/home/marvellgregory/.foundry/bin/cast
FORGE=/home/marvellgregory/.foundry/bin/forge
RPC=https://rpc.testnet.arc.io
CONTRACT=0x98a85fc032A985E3A267573Cce57378C464fFB86
USDC=0x3600000000000000000000000000000000000000
PROJECT=/home/marvellgregory/trustvault-solidity/gift-vault

echo "=== USDC ADDRESS ==="
$CAST call "$CONTRACT" 'usdc()(address)' --rpc-url "$RPC"

echo ""
echo "=== NEXT GIFT ID ==="
$CAST call "$CONTRACT" 'nextGiftId()(uint256)' --rpc-url "$RPC"

echo ""
echo "=== CONSTRUCTOR ARGS ==="
ENCODED=$($CAST abi-encode 'constructor(address)' "$USDC")
echo "$ENCODED"

echo ""
echo "=== VERIFY CONTRACT ==="
cd "$PROJECT"

$FORGE verify-contract \
  "$CONTRACT" \
  src/TrustVaultTimedGiftVault.sol:TrustVaultTimedGiftVault \
  --chain-id 5042002 \
  --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api/ \
  --constructor-args "$ENCODED"
