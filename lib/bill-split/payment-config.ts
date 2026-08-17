export { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_USDC_ADDRESS } from "@/lib/arc/arc-testnet-assets";
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.io";

export const billSplitUsdcAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
