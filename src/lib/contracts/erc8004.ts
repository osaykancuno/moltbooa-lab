import { ERC_8004_REGISTRY } from "@/lib/constants";

/**
 * Khôra's ERC-8004 Identity Registry on Shape (chainId 360).
 *
 * Address `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` is an ERC1967Proxy.
 * Current implementation (verified on Shapescan):
 *   `0x7274e874CA62410a93Bd8bf61c69d8045E399c02` (IdentityRegistryUpgradeable).
 *
 * The registry is itself an ERC-721 collection named "AgentIdentity" / symbol
 * "AGENT". Each call to `register(...)` mints a new agentId to the caller —
 * the agentId is DIFFERENT from the BOOA tokenId. The mapping
 * `bookTokenId ↔ agentId` is maintained off-chain by Khôra's API.
 *
 * ABI below is the authoritative set derived from the verified implementation.
 * Kept here for future read-paths (endpoint status checks, owner lookups)
 * and in case we ever want to bypass Khôra Bridge for writes. Today all
 * identity writes are delegated to khora.fun/bridge — see KHORA_BRIDGE_URL.
 */
export const erc8004Address = ERC_8004_REGISTRY as `0x${string}`;

export const erc8004Abi = [
  // ────────────── reads ──────────────
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "getMetadata",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
    ],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "isAuthorizedOrOwner",
    stateMutability: "view",
    inputs: [
      { name: "spender", type: "address" },
      { name: "agentId", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },

  // ────────────── writes ──────────────
  // Mints a new agentId to msg.sender. Three overloads exist on-chain:
  //   register()
  //   register(string agentURI)
  //   register(string agentURI, (string,bytes)[] metadata)
  // We keep only the two we actually use; adding another overload later is
  // just another array entry with the same name.
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "key", type: "string" },
          { name: "value", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAgentWallet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newWallet", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unsetAgentWallet",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },

  // ────────────── events (handy for indexers / toasts) ──────────────
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "URIUpdated",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "newURI", type: "string", indexed: false },
      { name: "updatedBy", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MetadataSet",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "indexedMetadataKey", type: "string", indexed: true },
      { name: "metadataKey", type: "string", indexed: false },
      { name: "metadataValue", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
] as const;
