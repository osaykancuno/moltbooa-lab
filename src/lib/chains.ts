/**
 * Supported EVM chains for the Agent Terminal.
 *
 * The identity layer (ERC-8004) lives on Shape and stays there: the two
 * propose_set_agent_* tools are hard-pinned to chainId 360. Everything else
 * (swaps, transfers, arbitrary contract calls, NFT mints) can target any
 * chain in this list — the guard allows them, wagmi has a transport, and
 * the execute hook will auto-switch the wallet before signing.
 *
 * Only mainnets. Public RPCs via viem defaults — no paid provider needed
 * for free-tier deploys. Holders can fork and add custom transports later.
 */

import {
  arbitrum,
  base,
  bsc,
  linea,
  mainnet,
  optimism,
  polygon,
  shape,
  zksync,
  type Chain,
} from "viem/chains";

/** Canonical list. Order here is the order shown in UI dropdowns. */
export const SUPPORTED_CHAINS = [
  shape, // 360 — home of BOOA + ERC-8004, listed first
  mainnet, // 1
  arbitrum, // 42161
  optimism, // 10
  base, // 8453
  polygon, // 137
  bsc, // 56
  linea, // 59144
  zksync, // 324
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];
export type SupportedChainId = SupportedChain["id"];

/** The identity registry chain — ERC-8004 writes must happen here. */
export const IDENTITY_CHAIN_ID: SupportedChainId = 360;

const BY_ID: Record<number, SupportedChain> = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [c.id, c])
);

export function isSupportedChainId(id: unknown): id is SupportedChainId {
  return typeof id === "number" && id in BY_ID;
}

export function chainById(id: number): SupportedChain | undefined {
  return BY_ID[id];
}

export function chainLabel(id: number): string {
  const c = BY_ID[id];
  return c?.name ?? `chain ${id}`;
}

/**
 * Chains we consider "expensive" — we'll surface a gentle warning on
 * the action card so the user isn't surprised by a $50 transfer fee.
 */
const EXPENSIVE_CHAIN_IDS = new Set<number>([mainnet.id]);
export function isExpensiveChain(id: number): boolean {
  return EXPENSIVE_CHAIN_IDS.has(id);
}

/** Explorer URL for a tx hash on the given chain, or null if unknown. */
export function txExplorerUrl(
  chainId: number,
  hash: `0x${string}`
): string | null {
  const c = BY_ID[chainId];
  const base = c?.blockExplorers?.default?.url;
  if (!base) return null;
  return `${base}/tx/${hash}`;
}
