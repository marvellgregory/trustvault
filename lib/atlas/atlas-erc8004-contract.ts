export const ATLAS_ERC8004_EXPECTED_CHAIN_ID = 5_042_002 as const;

export const ATLAS_ERC8004_IDENTITY_REGISTRY_ABI = Object.freeze([
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "agentURI", type: "string" }],
  },
  {
    type: "function",
    name: "getMetadata",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
    ],
    outputs: [{ name: "metadataValue", type: "bytes" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Registered",
    anonymous: false,
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const);

export type AtlasErc8004RegistryAddress = `0x${string}`;

export type AtlasErc8004Configuration = Readonly<{
  expectedChainId?: number;
  registryAddress?: string;
  agentId?: string;
  agentURI?: string;
}>;

export type AtlasErc8004RegistryEvidence = Readonly<{
  authority: "TRUSTED_READ_ONLY_REGISTRY_EVIDENCE";
  chainId: number;
  registryAddress: string;
  agentId: string;
  agentURI: string;
  ownerAddress: string;
  registrationExists: boolean;
  consistent: boolean;
}>;
