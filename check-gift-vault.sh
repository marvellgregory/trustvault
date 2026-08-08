CAST=/home/marvellgregory/.foundry/bin/cast
RPC=https://rpc.testnet.arc.io
VAULT=0x98a85fc032A985E3A267573Cce57378C464fFB86

echo "=== NEXT GIFT ID ==="
$CAST call "$VAULT" 'nextGiftId()(uint256)' --rpc-url "$RPC"
