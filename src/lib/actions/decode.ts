/**
 * Human-friendly decoders for `AgentAction` previews.
 *
 * We render the card with whatever we can extract:
 *   - "contract" actions already carry ABI + args — trivial.
 *   - "tx" actions only carry raw calldata — try to match the first 4 bytes
 *     against a tiny known-selector registry (ERC-20 / ERC-721 / ERC-8004
 *     functions we care about). If nothing matches, show raw calldata and
 *     render a visible warning banner.
 */

import {
  decodeFunctionData,
  formatEther,
  formatUnits,
  type Abi,
} from "viem";
import { erc8004Abi } from "@/lib/contracts/erc8004";
import { booaAbi } from "@/lib/contracts/booa";

/** Minimal ERC-20 write ABI — just what an LLM might realistically propose. */
const erc20WriteAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** Additional ERC-721 writes the read-only booaAbi doesn't have. */
const erc721WriteAbi = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const KNOWN_ABIS: readonly Abi[] = [
  erc20WriteAbi as unknown as Abi,
  erc721WriteAbi as unknown as Abi,
  booaAbi as unknown as Abi,
  erc8004Abi as unknown as Abi,
];

export interface DecodedCalldata {
  matched: boolean;
  functionName?: string;
  args?: readonly unknown[];
  /** The ABI that matched, if any. Useful for downstream tooling. */
  abi?: Abi;
}

export function tryDecodeCalldata(data: `0x${string}`): DecodedCalldata {
  if (!data || data === "0x") {
    return { matched: false };
  }
  for (const abi of KNOWN_ABIS) {
    try {
      const decoded = decodeFunctionData({ abi, data });
      return {
        matched: true,
        functionName: decoded.functionName,
        args: decoded.args as readonly unknown[] | undefined,
        abi,
      };
    } catch {
      // try next
    }
  }
  return { matched: false };
}

/** Convert a wei decimal string to a short ETH/SHAPE display (4 sig digits). */
export function formatValue(weiDecimalStr?: string): string {
  if (!weiDecimalStr || weiDecimalStr === "0") return "0 ETH";
  try {
    const v = BigInt(weiDecimalStr);
    const eth = formatEther(v);
    return `${eth} ETH`;
  } catch {
    return `${weiDecimalStr} wei`;
  }
}

/** Human-render a single arg value. */
export function formatArg(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "bigint") {
    // Best-effort: numbers that look like wei get a smaller-scale hint.
    if (value >= BigInt("1000000000000000")) return `${value.toString()} (${formatUnits(value, 18)}×1e18)`;
    return value.toString();
  }
  if (typeof value === "string") {
    if (value.length > 80) return value.slice(0, 77) + "…";
    return value;
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatArg).join(", ")}]`;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? s.slice(0, 117) + "…" : s;
  } catch {
    return "<unserializable>";
  }
}
