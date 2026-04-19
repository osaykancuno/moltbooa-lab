"use client";

/**
 * Single proposal card. Renders title + rationale + decoded body + guard
 * warnings + pre-flight simulation + APPROVE / REJECT.
 *
 * Decision flow:
 *   1. guardAction()    — blockers = no approval; warnings = require confirm
 *   2. simulateAction() — on mount; failure → "OVERRIDE" double-confirm
 *   3. APPROVE          — wagmi executes, caller is notified via onResult
 */

import { useEffect, useMemo, useState } from "react";
import type { AgentAction, ActionResult, ActionStatus } from "@/lib/actions/types";
import { guardAction, isBlocked, type GuardWarning } from "@/lib/actions/guard";
import { simulateAction, type SimulationResult } from "@/lib/actions/simulate";
import DecodedCalldata from "./DecodedCalldata";

interface Props {
  action: AgentAction;
  walletAddress: `0x${string}` | undefined;
  status: ActionStatus;
  result?: ActionResult;
  onApprove: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
}

const KIND_LABEL: Record<AgentAction["kind"], string> = {
  contract: "CONTRACT CALL",
  tx: "RAW TX",
  sign_msg: "SIGN MESSAGE",
  typed_data: "TYPED DATA",
};

export default function ActionCard({
  action,
  walletAddress,
  status,
  result,
  onApprove,
  onReject,
}: Props) {
  const warnings = useMemo(
    () => guardAction(action, walletAddress),
    [action, walletAddress]
  );
  const blocked = isBlocked(warnings);

  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [override, setOverride] = useState(false);
  const [confirmHigh, setConfirmHigh] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (blocked) {
      setSim(null);
      return;
    }
    setSimLoading(true);
    simulateAction(action, walletAddress)
      .then((r) => {
        if (!cancelled) setSim(r);
      })
      .finally(() => {
        if (!cancelled) setSimLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [action, walletAddress, blocked]);

  const highValue = warnings.find((w) => w.code === "high_value");
  const selfTarget = warnings.find((w) => w.code === "self_target");
  const needsHighConfirm = !!highValue && confirmHigh.trim() !== "CONFIRM";

  const simFailed = sim ? !sim.ok : false;
  const needsOverride = simFailed && !override;

  const terminal =
    status === "success" || status === "failed" || status === "rejected";

  const approveDisabled =
    blocked || needsHighConfirm || needsOverride || status === "signing" || terminal;

  return (
    <div
      className={`rounded border p-3 space-y-3 ${
        blocked
          ? "border-accent-red/50 bg-accent-red/5"
          : status === "success"
            ? "border-accent-green/40 bg-accent-green/5"
            : status === "failed"
              ? "border-accent-red/40 bg-accent-red/5"
              : status === "rejected"
                ? "border-foreground/20 bg-card-bg/60"
                : "border-card-border bg-card-bg"
      }`}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="font-[family-name:var(--font-pixel)] text-[9px] text-foreground/40 tracking-wider">
            {KIND_LABEL[action.kind]}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[12px] text-foreground/90 leading-tight">
            {action.title}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* rationale */}
      {action.rationale && (
        <p className="text-[10px] text-foreground/60 leading-relaxed border-l-2 border-accent-purple/40 pl-2">
          <span className="font-[family-name:var(--font-pixel)] text-[9px] text-accent-purple mr-1">
            AGENT:
          </span>
          {action.rationale}
        </p>
      )}

      {/* decoded body */}
      <DecodedCalldata action={action} />

      {/* guard warnings */}
      {warnings.length > 0 && <WarningList warnings={warnings} />}

      {/* simulation */}
      {!blocked && (
        <SimulationPanel loading={simLoading} sim={sim} offChain={action.kind === "sign_msg" || action.kind === "typed_data"} />
      )}

      {/* result on terminal state */}
      {result && terminal && (
        <div className="text-[10px] font-[family-name:var(--font-mono)] text-foreground/60 break-all">
          {result.hash && <div>tx: {result.hash}</div>}
          {result.blockNumber && <div>block: {result.blockNumber}</div>}
          {result.signature && (
            <div>sig: {result.signature.slice(0, 30)}…</div>
          )}
          {result.error && (
            <div className="text-accent-red">err: {result.error}</div>
          )}
        </div>
      )}

      {/* injection defense reminder */}
      {!terminal && !blocked && (
        <p className="text-[9px] text-foreground/40 leading-snug border-t border-card-border pt-2">
          ⚠ This was proposed by the agent. Never approve what you don&apos;t
          understand. Only the rationale above is the agent&apos;s — the
          calldata is the ground truth.
        </p>
      )}

      {/* high-value confirmation */}
      {!terminal && highValue && (
        <div className="space-y-1">
          <div className="text-[10px] font-[family-name:var(--font-pixel)] text-accent-red">
            ⚠ HIGH VALUE — TYPE &quot;CONFIRM&quot; TO UNLOCK
          </div>
          <input
            type="text"
            value={confirmHigh}
            onChange={(e) => setConfirmHigh(e.target.value)}
            placeholder="CONFIRM"
            className="w-full text-[11px] px-2 py-1.5 bg-background border border-accent-red/40 rounded font-[family-name:var(--font-mono)] focus:outline-none focus:border-accent-red"
          />
        </div>
      )}

      {/* simulation-fail override */}
      {!terminal && simFailed && (
        <label className="flex items-center gap-2 text-[10px] text-accent-red">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
          />
          <span>
            Simulation failed. Override and sign anyway (I know what I&apos;m
            doing).
          </span>
        </label>
      )}

      {/* self-target soft warning already shown via WarningList — no extra input */}
      {selfTarget && !terminal && (
        <p className="text-[9px] text-foreground/50">
          Note: target is your own wallet. Double-check before approving.
        </p>
      )}

      {/* actions */}
      {!terminal && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onApprove(action)}
            disabled={approveDisabled}
            className="flex-1 text-[10px] px-3 py-2 rounded border font-[family-name:var(--font-pixel)] bg-accent-green/20 border-accent-green/50 text-accent-green hover:bg-accent-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === "signing"
              ? "SIGNING…"
              : simFailed
                ? "OVERRIDE & APPROVE"
                : "APPROVE"}
          </button>
          <button
            onClick={() => onReject(action)}
            disabled={status === "signing"}
            className="flex-1 text-[10px] px-3 py-2 rounded border font-[family-name:var(--font-pixel)] bg-card-bg border-card-border text-foreground/60 hover:text-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            REJECT
          </button>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ActionStatus }) {
  const map: Record<ActionStatus, { label: string; cls: string }> = {
    pending: {
      label: "PENDING",
      cls: "bg-foreground/10 text-foreground/60",
    },
    signing: {
      label: "SIGNING",
      cls: "bg-accent-purple/20 text-accent-purple",
    },
    success: {
      label: "✓ DONE",
      cls: "bg-accent-green/20 text-accent-green",
    },
    failed: {
      label: "✗ FAILED",
      cls: "bg-accent-red/20 text-accent-red",
    },
    rejected: {
      label: "— REJECTED",
      cls: "bg-foreground/10 text-foreground/50",
    },
  };
  const p = map[status];
  return (
    <span
      className={`text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-pixel)] shrink-0 ${p.cls}`}
    >
      {p.label}
    </span>
  );
}

function WarningList({ warnings }: { warnings: GuardWarning[] }) {
  return (
    <ul className="space-y-1">
      {warnings.map((w, i) => (
        <li
          key={i}
          className={`text-[10px] rounded border px-2 py-1 leading-relaxed ${
            w.level === "block"
              ? "border-accent-red/50 bg-accent-red/10 text-accent-red"
              : "border-accent-yellow/40 bg-accent-yellow/5 text-accent-yellow"
          }`}
        >
          <span className="font-[family-name:var(--font-pixel)] text-[9px] mr-1">
            {w.level === "block" ? "BLOCK" : "WARN"}
          </span>
          {w.message}
        </li>
      ))}
    </ul>
  );
}

function SimulationPanel({
  loading,
  sim,
  offChain,
}: {
  loading: boolean;
  sim: SimulationResult | null;
  offChain: boolean;
}) {
  if (offChain) {
    return (
      <div className="text-[10px] text-foreground/50 font-[family-name:var(--font-mono)]">
        off-chain signature · nothing to simulate
      </div>
    );
  }
  if (loading) {
    return (
      <div className="text-[10px] text-foreground/50 font-[family-name:var(--font-pixel)]">
        SIMULATING…
      </div>
    );
  }
  if (!sim) return null;
  if (sim.ok) {
    return (
      <div className="text-[10px] text-accent-green font-[family-name:var(--font-mono)]">
        ✓ simulation ok
      </div>
    );
  }
  return (
    <div className="rounded border border-accent-red/40 bg-accent-red/5 p-2 space-y-0.5">
      <div className="text-[10px] font-[family-name:var(--font-pixel)] text-accent-red">
        ✗ SIMULATION FAILED
      </div>
      <div className="text-[10px] text-foreground/60 font-[family-name:var(--font-mono)] break-words">
        {sim.reason ?? "unknown reason"}
      </div>
    </div>
  );
}
