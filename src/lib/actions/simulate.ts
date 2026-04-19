/**
 * Best-effort dry-run for a proposed action via `eth_call`-level simulation.
 *
 * We use wagmi's publicClient under the hood so we stay consistent with the
 * configured transport (mainnet.shape.network) and chain. If simulation
 * fails (reverted, gas, bad args) we return a structured reason — the UI
 * then nudges the user to double-confirm with an "OVERRIDE" flow.
 */

import { getPublicClient } from "wagmi/actions";
import { type Abi } from "viem";
import { wagmiConfig } from "@/lib/wagmi-config";
import type { AgentAction } from "./types";
import { TARGET_CHAIN_ID } from "./types";

export interface SimulationResult {
  ok: boolean;
  reason?: string;
  /** Returned value from the contract call, if any. */
  result?: unknown;
}

export async function simulateAction(
  action: AgentAction,
  from: `0x${string}` | undefined
): Promise<SimulationResult> {
  if (action.kind === "sign_msg" || action.kind === "typed_data") {
    // Off-chain signatures can't be simulated — they always "succeed" locally.
    return { ok: true };
  }

  const client = getPublicClient(wagmiConfig, { chainId: TARGET_CHAIN_ID });
  if (!client) {
    return { ok: false, reason: "No public client for Shape (360)." };
  }

  try {
    if (action.kind === "contract") {
      const sim = await client.simulateContract({
        address: action.address,
        abi: action.abi as Abi,
        functionName: action.functionName,
        args: action.args,
        value: action.value ? BigInt(action.value) : undefined,
        account: from,
      });
      return { ok: true, result: sim.result };
    }

    // "tx" kind — raw calldata. Use eth_call semantics via client.call.
    const res = await client.call({
      to: action.to,
      data: action.data,
      value: action.value ? BigInt(action.value) : undefined,
      account: from,
    });
    return { ok: true, result: res.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // viem errors can be verbose; keep the first line + short reason.
    const firstLine = msg.split("\n").find((l) => l.trim()) ?? msg;
    return { ok: false, reason: firstLine.slice(0, 220) };
  }
}
