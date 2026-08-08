CAST=/home/marvellgregory/.foundry/bin/cast
RPC=https://rpc.testnet.arc.io
VAULT=0x98a85fc032A985E3A267573Cce57378C464fFB86

echo "========================================"
echo "GIFT #1"
echo "========================================"
$CAST call "$VAULT" 'getGift(uint256)((address,address,uint256,uint64,bool))' 1 --rpc-url "$RPC"
echo "--- Claimable ---"
$CAST call "$VAULT" 'isClaimable(uint256)(bool)' 1 --rpc-url "$RPC"

echo ""
echo "========================================"
echo "GIFT #2"
echo "========================================"
$CAST call "$VAULT" 'getGift(uint256)((address,address,uint256,uint64,bool))' 2 --rpc-url "$RPC"
echo "--- Claimable ---"
$CAST call "$VAULT" 'isClaimable(uint256)(bool)' 2 --rpc-url "$RPC"

echo ""
echo "========================================"
echo "GIFT #3"
echo "========================================"
$CAST call "$VAULT" 'getGift(uint256)((address,address,uint256,uint64,bool))' 3 --rpc-url "$RPC"
echo "--- Claimable ---"
$CAST call "$VAULT" 'isClaimable(uint256)(bool)' 3 --rpc-url "$RPC"
