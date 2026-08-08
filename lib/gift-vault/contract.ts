import { parseAbi } from "viem";

export const TRUSTVAULT_GIFT_VAULT_ADDRESS =
  "0x98a85fc032A985E3A267573Cce57378C464fFB86" as const;

export const ARC_TESTNET_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";

export const giftVaultAbi = parseAbi([
  "event GiftCreated(uint256 indexed giftId,address indexed sender,address indexed recipient,uint256 amount,uint64 unlockTimestamp)",
  "event GiftClaimed(uint256 indexed giftId,address indexed recipient,uint256 amount,uint256 claimedAt)",
  "function createGift(address recipient,uint256 amount,uint64 unlockTimestamp) returns (uint256 giftId)",
  "function claim(uint256 giftId)",
  "function getGift(uint256 giftId) view returns ((address sender,address recipient,uint256 amount,uint64 unlockTimestamp,bool claimed) gift)",
  "function isClaimable(uint256 giftId) view returns (bool)",
  "function nextGiftId() view returns (uint256)",
  "function usdc() view returns (address)",
]);

export const usdcAbi = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);
