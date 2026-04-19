"use client";

/**
 * Ring-buffer of terminal events persisted to localStorage per tokenId.
 *
 * Serves two jobs:
 *   1. Let the holder scroll back to past actions after a page refresh (full
 *      chat state is still ephemeral by design — we only keep action log).
 *   2. "EXPORT JSON" button for post-hoc auditing / dispute resolution.
 *
 * Shape-agnostic by design (no wagmi import) so it can be called from
 * anywhere and is safe to import in server components that later hydrate.
 */

import type { AgentAction, ActionResult } from "./actions/types";

const MAX_ENTRIES = 200;

export interface TerminalLogEntry {
  ts: number;
  tokenId: string;
  action: AgentAction;
  result?: ActionResult;
}

function keyFor(tokenId: string): string {
  return `moltbook.terminal.log.${tokenId}`;
}

function safeParse(raw: string | null): TerminalLogEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TerminalLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadLog(tokenId: string): TerminalLogEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(keyFor(tokenId)));
}

export function appendLog(
  tokenId: string,
  entry: TerminalLogEntry
): TerminalLogEntry[] {
  if (typeof window === "undefined") return [];
  const existing = loadLog(tokenId);
  const next = [...existing, entry].slice(-MAX_ENTRIES);
  try {
    window.localStorage.setItem(keyFor(tokenId), JSON.stringify(next));
  } catch {
    // Quota exceeded or disabled — swallow; the log is best-effort UX, not truth.
  }
  return next;
}

export function clearLog(tokenId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(tokenId));
  } catch {
    // ignore
  }
}

export function downloadLogAsJson(tokenId: string): void {
  if (typeof window === "undefined") return;
  const entries = loadLog(tokenId);
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `moltbook-terminal-${tokenId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
