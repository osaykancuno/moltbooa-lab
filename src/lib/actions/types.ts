/**
 * Agent Terminal — intent protocol.
 *
 * An `AgentAction` is a proposal, not an execution. The holder's endpoint
 * emits actions; the browser (via wagmi) is the *only* executor. This keeps
 * our invariant intact: no private key ever leaves the holder's wallet.
 *
 * Four kinds cover the useful surface:
 *   - "contract"   — a typed contract call (address + ABI + args). Preferred
 *                    shape: enables decoded preview and simulation.
 *   - "tx"         — raw calldata (to + data + value). Fallback when the
 *                    LLM can't supply an ABI. Rendered with a warning.
 *   - "sign_msg"   — personal_sign on a human-readable string.
 *   - "typed_data" — EIP-712 typed signature (auth, orders, …).
 *
 * The `id` is a stable opaque string the endpoint generates (uuid v4 or
 * similar). The terminal echoes it back in the feedback message so the LLM
 * can correlate proposals with outcomes across turns.
 */

import type { Abi, TypedDataDomain } from "viem";

export const TARGET_CHAIN_ID = 360; // Shape

export interface ActionMeta {
  /** Opaque, stable id. Echoed back in feedback messages. */
  id: string;
  /** Short human title shown on the card header. */
  title: string;
  /** Free-form "why the agent proposes this". Never trusted as safe. */
  rationale: string;
}

export type ActionTx = ActionMeta & {
  kind: "tx";
  to: `0x${string}`;
  data: `0x${string}`;
  /** Wei as decimal string. Omitted or "0" for pure calldata. */
  value?: string;
  chainId: typeof TARGET_CHAIN_ID;
};

export type ActionContract = ActionMeta & {
  kind: "contract";
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: unknown[];
  value?: string;
  chainId: typeof TARGET_CHAIN_ID;
};

export type ActionSignMessage = ActionMeta & {
  kind: "sign_msg";
  message: string;
};

export type ActionTypedData = ActionMeta & {
  kind: "typed_data";
  domain: TypedDataDomain;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

export type AgentAction =
  | ActionTx
  | ActionContract
  | ActionSignMessage
  | ActionTypedData;

/** Outcome of an action, appended to the terminal log and fed back to the LLM. */
export type ActionStatus =
  | "pending"
  | "signing"
  | "success"
  | "failed"
  | "rejected";

export interface ActionResult {
  id: string;
  status: ActionStatus;
  /** Tx hash on success/failed. Signature hex for sign_msg/typed_data. */
  hash?: `0x${string}`;
  signature?: `0x${string}`;
  /** Block number once mined. */
  blockNumber?: number;
  error?: string;
  startedAt: number;
  endedAt?: number;
}

/**
 * Item logged by the off-chain read tools the endpoint ran during this turn.
 * Shown to the user as a collapsible "AGENT READ" breadcrumb for transparency.
 */
export interface AgentRead {
  tool: string;
  query?: string;
  ok: boolean;
  /** Truncated preview (<= 400 chars) shown inline. */
  preview?: string;
  error?: string;
}

/** Extended /chat response. Backward-compatible: `content` still required. */
export interface TerminalChatResponse {
  content: string;
  actions?: AgentAction[];
  reads?: AgentRead[];
}

/** Build the feedback message appended to the next request so the LLM knows what happened. */
export function formatActionFeedback(
  results: ActionResult[]
): string | null {
  if (results.length === 0) return null;
  const lines = results.map((r) => {
    const bits: string[] = [`action ${r.id}: ${r.status.toUpperCase()}`];
    if (r.hash) bits.push(`tx=${r.hash}`);
    if (r.blockNumber) bits.push(`block=${r.blockNumber}`);
    if (r.signature) bits.push(`sig=${r.signature.slice(0, 18)}…`);
    if (r.error) bits.push(`err=${r.error.slice(0, 120)}`);
    return `- ${bits.join(" ")}`;
  });
  return `[system] action results:\n${lines.join("\n")}`;
}
