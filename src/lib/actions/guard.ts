/**
 * Pure validators for `AgentAction` proposals arriving from the endpoint.
 *
 * These run client-side *before* we offer the APPROVE button — they are the
 * last line of defense between an LLM that went off the rails (or a prompt
 * injection from a fetched URL) and the user's wallet signing something bad.
 */

import { parseEther } from "viem";
import type { AgentAction } from "./types";
import { TARGET_CHAIN_ID } from "./types";

export interface GuardWarning {
  level: "warn" | "block";
  code:
    | "wrong_chain"
    | "bad_address"
    | "self_target"
    | "high_value"
    | "missing_fields"
    | "bad_calldata";
  message: string;
}

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x([0-9a-fA-F]{2})*$/;

const HIGH_VALUE_WEI = parseEther("1"); // > 1 ETH equivalent triggers extra confirm

export function guardAction(
  action: AgentAction,
  walletAddress: `0x${string}` | undefined
): GuardWarning[] {
  const out: GuardWarning[] = [];

  // ── shape & chain
  if (!action.id || typeof action.id !== "string") {
    out.push({
      level: "block",
      code: "missing_fields",
      message: "Action is missing a stable id.",
    });
  }

  if (action.kind === "contract" || action.kind === "tx") {
    if (action.chainId !== TARGET_CHAIN_ID) {
      out.push({
        level: "block",
        code: "wrong_chain",
        message: `chainId=${action.chainId}. This terminal only signs on Shape (360).`,
      });
    }
  }

  // ── address shape
  if (action.kind === "contract") {
    if (!ADDR_RE.test(action.address)) {
      out.push({
        level: "block",
        code: "bad_address",
        message: `Bad contract address: ${action.address}`,
      });
    }
    if (!action.functionName || !Array.isArray(action.abi)) {
      out.push({
        level: "block",
        code: "missing_fields",
        message: "contract action missing abi/functionName.",
      });
    }
  }

  if (action.kind === "tx") {
    if (!ADDR_RE.test(action.to)) {
      out.push({
        level: "block",
        code: "bad_address",
        message: `Bad destination address: ${action.to}`,
      });
    }
    if (!HEX_RE.test(action.data)) {
      out.push({
        level: "block",
        code: "bad_calldata",
        message: "Calldata is not valid hex.",
      });
    }
  }

  // ── value guard
  const valueStr =
    (action.kind === "tx" || action.kind === "contract") && action.value
      ? action.value
      : null;
  if (valueStr) {
    try {
      const v = BigInt(valueStr);
      if (v < BigInt(0)) {
        out.push({
          level: "block",
          code: "missing_fields",
          message: "value is negative.",
        });
      } else if (v >= HIGH_VALUE_WEI) {
        out.push({
          level: "warn",
          code: "high_value",
          message: `This action will send ≥1 ETH (${valueStr} wei). Require explicit confirm.`,
        });
      }
    } catch {
      out.push({
        level: "block",
        code: "missing_fields",
        message: "value is not a decimal wei string.",
      });
    }
  }

  // ── self-target (suspicious) — only meaningful when we know the wallet
  if (walletAddress) {
    const target =
      action.kind === "contract"
        ? action.address
        : action.kind === "tx"
          ? action.to
          : null;
    if (target && target.toLowerCase() === walletAddress.toLowerCase()) {
      out.push({
        level: "warn",
        code: "self_target",
        message: "Target address equals your connected wallet. Unusual.",
      });
    }
  }

  // ── sign_msg: bound length
  if (action.kind === "sign_msg") {
    if (!action.message || action.message.length > 4000) {
      out.push({
        level: "block",
        code: "missing_fields",
        message: "sign_msg requires a 1–4000 char message.",
      });
    }
  }

  return out;
}

export function isBlocked(warnings: GuardWarning[]): boolean {
  return warnings.some((w) => w.level === "block");
}
