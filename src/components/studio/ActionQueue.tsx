"use client";

/**
 * Vertical list of pending + completed proposals. Lives in the right pane of
 * the terminal layout.
 *
 * State ownership: this component is pure presentation — the parent
 * (AgentTerminalChat) owns the `items` state and wires approve/reject.
 */

import type { AgentAction, ActionResult, ActionStatus } from "@/lib/actions/types";
import ActionCard from "./ActionCard";

export interface QueueItem {
  action: AgentAction;
  status: ActionStatus;
  result?: ActionResult;
}

interface Props {
  items: QueueItem[];
  walletAddress: `0x${string}` | undefined;
  onApprove: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
  onExportLog: () => void;
  onClearLog: () => void;
}

export default function ActionQueue({
  items,
  walletAddress,
  onApprove,
  onReject,
  onExportLog,
  onClearLog,
}: Props) {
  const pending = items.filter(
    (i) => i.status === "pending" || i.status === "signing"
  );
  const history = items.filter(
    (i) =>
      i.status === "success" || i.status === "failed" || i.status === "rejected"
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple tracking-wider">
          ── ACTION QUEUE ({pending.length}) ──
        </h3>
        {pending.length === 0 ? (
          <div className="rounded border border-card-border bg-card-bg/40 p-4 text-[10px] text-foreground/40 font-[family-name:var(--font-mono)] text-center">
            no pending actions · ask your agent to do something
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((it) => (
              <ActionCard
                key={it.action.id}
                action={it.action}
                walletAddress={walletAddress}
                status={it.status}
                result={it.result}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/50 tracking-wider">
            ── HISTORY ({history.length}) ──
          </h3>
          <div className="flex gap-1">
            <button
              onClick={onExportLog}
              className="text-[9px] px-2 py-1 rounded border border-card-border bg-card-bg text-foreground/60 hover:text-foreground/90 font-[family-name:var(--font-pixel)]"
            >
              EXPORT JSON
            </button>
            <button
              onClick={onClearLog}
              className="text-[9px] px-2 py-1 rounded border border-card-border bg-card-bg text-foreground/50 hover:text-accent-red font-[family-name:var(--font-pixel)]"
            >
              CLEAR
            </button>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="text-[10px] text-foreground/40 font-[family-name:var(--font-mono)]">
            nothing yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history
              .slice()
              .reverse()
              .map((it) => (
                <ActionCard
                  key={it.action.id}
                  action={it.action}
                  walletAddress={walletAddress}
                  status={it.status}
                  result={it.result}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
