"use client";

/**
 * Owner-only chat with action proposal queue.
 *
 * Flow:
 *   1. User sends a message.
 *   2. Endpoint replies with { content, actions?, reads? }.
 *   3. Assistant text lands in the chat pane.
 *   4. Each proposed action is rendered in the right pane as an ActionCard.
 *   5. User clicks APPROVE → wagmi signs → we capture result, append to log,
 *      and stage a `[system] action <id>: ...` pseudo-message that will be
 *      prepended to the *next* user turn so the LLM knows what happened.
 *
 * State is ephemeral on refresh (except the audit log in localStorage).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  postToAgentEndpoint,
  EndpointError,
  type ChatMessage,
} from "@/lib/endpoint-client";
import type {
  AgentAction,
  ActionResult,
  ActionStatus,
  AgentRead,
  AgentDeliverable,
} from "@/lib/actions/types";
import { formatActionFeedback } from "@/lib/actions/types";
import { useExecuteAction } from "@/lib/actions/execute";
import {
  appendLog,
  clearLog,
  downloadLogAsJson,
  loadLog,
} from "@/lib/terminal-log";
import {
  formatPrefsPreamble,
  loadPrefs,
  type HolderPrefs,
} from "@/lib/terminal-prefs";
import ActionQueue, { type QueueItem } from "./ActionQueue";
import DeliverableCard from "./DeliverableCard";
import PrefsPanel from "./PrefsPanel";
import TxToast from "./TxToast";

interface Props {
  tokenId: string;
  agentName: string;
  endpointUrl: string;
}

export default function AgentTerminalChat({
  tokenId,
  agentName,
  endpointUrl,
}: Props) {
  const { address } = useAccount();
  const { execute } = useExecuteAction();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `terminal online. i am ${agentName}. tell me what to do — i'll draft proposals, you sign.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ headline: string; hint?: string } | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reads, setReads] = useState<AgentRead[]>([]);
  const [deliverables, setDeliverables] = useState<AgentDeliverable[]>([]);
  const [toast, setToast] = useState<
    { result: ActionResult; chainId?: number } | null
  >(null);

  // Feedback staged by approvals/rejections, drained into the next user turn.
  const pendingFeedbackRef = useRef<ActionResult[]>([]);
  // Holder preferences kept in a ref so `send()` always reads the latest
  // without retriggering its useCallback.
  const prefsRef = useRef<HolderPrefs>(loadPrefs(tokenId));

  // Seed history from localStorage on mount so refresh keeps the audit trail.
  useEffect(() => {
    const entries = loadLog(tokenId);
    if (entries.length === 0) return;
    const seed: QueueItem[] = entries.map((e) => ({
      action: e.action,
      status: (e.result?.status ?? "rejected") as ActionStatus,
      result: e.result,
    }));
    setQueue(seed);
  }, [tokenId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, reads]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    // Drain any pending action feedback into a pseudo-user preamble so the
    // LLM has context about what its previous proposals actually did.
    const feedback = formatActionFeedback(pendingFeedbackRef.current);
    pendingFeedbackRef.current = [];

    const turn: ChatMessage[] = [...messages];
    // Inject holder preferences once per turn. They're cheap and the LLM
    // handles the redundancy well — it's worth it for consistency on every
    // recommendation, not just the first.
    const prefPreamble = formatPrefsPreamble(prefsRef.current);
    if (prefPreamble) {
      turn.push({ role: "user", content: prefPreamble });
    }
    if (feedback) {
      turn.push({ role: "user", content: feedback });
    }
    turn.push({ role: "user", content: text });

    setMessages(turn);
    setInput("");
    setBusy(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await postToAgentEndpoint(
        endpointUrl,
        { messages: turn, tokenId },
        controller.signal,
        60_000 // give it longer; tool loops can take a few seconds
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
      if (reply.reads?.length) {
        setReads((prev) => [...prev, ...reply.reads!]);
      }
      if (reply.deliverables?.length) {
        setDeliverables((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const fresh = reply.deliverables!.filter((d) => !existingIds.has(d.id));
          return [...prev, ...fresh];
        });
      }
      if (reply.actions?.length) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((p) => p.action.id));
          const fresh = reply.actions!
            .filter((a) => !existingIds.has(a.id))
            .map<QueueItem>((action) => ({ action, status: "pending" }));
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }, [busy, input, messages, endpointUrl, tokenId]);

  const onApprove = useCallback(
    async (action: AgentAction) => {
      setQueue((prev) =>
        prev.map((it) =>
          it.action.id === action.id ? { ...it, status: "signing" } : it
        )
      );
      const result = await execute(action);
      setQueue((prev) =>
        prev.map((it) =>
          it.action.id === action.id
            ? { ...it, status: result.status, result }
            : it
        )
      );
      pendingFeedbackRef.current.push(result);
      appendLog(tokenId, {
        ts: Date.now(),
        tokenId,
        action,
        result,
      });
      const chainId =
        action.kind === "contract" || action.kind === "tx"
          ? action.chainId
          : undefined;
      setToast({ result, chainId });
    },
    [execute, tokenId]
  );

  const onReject = useCallback(
    (action: AgentAction) => {
      const result: ActionResult = {
        id: action.id,
        status: "rejected",
        startedAt: Date.now(),
        endedAt: Date.now(),
        error: "User rejected proposal",
      };
      setQueue((prev) =>
        prev.map((it) =>
          it.action.id === action.id
            ? { ...it, status: "rejected", result }
            : it
        )
      );
      pendingFeedbackRef.current.push(result);
      appendLog(tokenId, {
        ts: Date.now(),
        tokenId,
        action,
        result,
      });
    },
    [tokenId]
  );

  const onExportLog = useCallback(() => {
    downloadLogAsJson(tokenId);
  }, [tokenId]);

  const onClearLog = useCallback(() => {
    clearLog(tokenId);
    setQueue((prev) =>
      prev.filter((it) => it.status === "pending" || it.status === "signing")
    );
  }, [tokenId]);

  const visibleMessages = useMemo(
    () =>
      // Hide internal "[system] ..." pseudo-user messages from the UI.
      messages.filter(
        (m) => !(m.role === "user" && m.content.startsWith("[system]"))
      ),
    [messages]
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
        {/* ── CHAT pane ── */}
        <div className="space-y-3">
          <div
            ref={scrollRef}
            className="h-[28rem] overflow-y-auto rounded border border-card-border bg-card-bg p-3 space-y-2 text-xs font-[family-name:var(--font-mono)]"
          >
            {visibleMessages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : ""}
              >
                <span
                  className={`inline-block max-w-[85%] px-2 py-1.5 rounded ${
                    m.role === "user"
                      ? "bg-accent-purple/20 border border-accent-purple/40 text-accent-purple"
                      : "bg-background border border-card-border text-foreground/80"
                  }`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            {reads.length > 0 && (
              <details className="mt-2 text-[10px] text-foreground/50">
                <summary className="cursor-pointer font-[family-name:var(--font-pixel)] text-foreground/50">
                  AGENT READ ({reads.length})
                </summary>
                <ul className="mt-1 space-y-1 pl-2">
                  {reads.map((r, i) => (
                    <li key={i} className="leading-snug">
                      <span
                        className={
                          r.ok ? "text-accent-cyan" : "text-accent-red"
                        }
                      >
                        {r.ok ? "✓" : "✗"} {r.tool}
                      </span>
                      {r.query && (
                        <span className="text-foreground/40">
                          {" "}
                          · {r.query}
                        </span>
                      )}
                      {r.preview && (
                        <div className="text-foreground/50 pl-3 break-words">
                          {r.preview}
                        </div>
                      )}
                      {r.error && (
                        <div className="text-accent-red pl-3 break-words">
                          {r.error}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {busy && (
              <div className="text-[10px] text-foreground/40 font-[family-name:var(--font-pixel)]">
                {agentName.toUpperCase()} IS THINKING…
              </div>
            )}
          </div>

          {error && (
            <div className="rounded border border-accent-red/40 bg-accent-red/5 p-2 space-y-1 text-[10px] font-[family-name:var(--font-mono)]">
              <div className="text-accent-red">✗ {error.headline}</div>
              {error.hint && (
                <div className="text-foreground/60 leading-relaxed">
                  {error.hint}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell your agent what to do…"
              maxLength={2000}
              disabled={busy}
              className="flex-1 text-xs px-3 py-2 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60 font-[family-name:var(--font-mono)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="text-[10px] px-4 py-2 rounded border font-[family-name:var(--font-pixel)] bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </form>

          <p className="text-[9px] text-foreground/30 font-[family-name:var(--font-mono)]">
            owner-only · endpoint:{" "}
            <span className="text-foreground/50 break-all">{endpointUrl}</span>
          </p>
        </div>

        {/* ── QUEUE + DELIVERABLES pane ── */}
        <div className="space-y-4">
          <PrefsPanel
            tokenId={tokenId}
            onChange={(p) => {
              prefsRef.current = p;
            }}
          />
          <ActionQueue
            items={queue}
            walletAddress={address}
            onApprove={onApprove}
            onReject={onReject}
            onExportLog={onExportLog}
            onClearLog={onClearLog}
          />
          {deliverables.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan tracking-wider">
                  DELIVERABLES ({deliverables.length})
                </h3>
                <button
                  onClick={() => setDeliverables([])}
                  className="text-[9px] text-foreground/40 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
                >
                  CLEAR
                </button>
              </div>
              <div className="space-y-2">
                {deliverables.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TxToast
        result={toast?.result ?? null}
        chainId={toast?.chainId}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}

function describeError(err: unknown): { headline: string; hint?: string } {
  if (err instanceof EndpointError) {
    switch (err.kind) {
      case "timeout":
        return {
          headline: "Endpoint timed out",
          hint: "Tool loops can be slow. Try again or simplify the request.",
        };
      case "network":
        return {
          headline: "Could not reach endpoint",
          hint: "Endpoint offline or CORS blocking. Check ALLOWED_ORIGIN.",
        };
      case "http":
        return { headline: err.message };
      case "malformed":
        return {
          headline: "Endpoint returned an invalid response",
          hint: "Expected { content: string, actions?, reads? }.",
        };
      case "invalid_url":
        return { headline: err.message };
    }
  }
  return {
    headline: err instanceof Error ? err.message : "Endpoint unreachable",
  };
}
