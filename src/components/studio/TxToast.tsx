"use client";

import { useEffect } from "react";
import { SHAPE_EXPLORER } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/types";

interface Props {
  result: ActionResult | null;
  onDismiss: () => void;
}

/**
 * Tiny floating toast for the most recent action result. Auto-dismisses after
 * 6s on success, stays until clicked on failure.
 */
export default function TxToast({ result, onDismiss }: Props) {
  useEffect(() => {
    if (!result) return;
    if (result.status === "success") {
      const t = setTimeout(onDismiss, 6000);
      return () => clearTimeout(t);
    }
  }, [result, onDismiss]);

  if (!result) return null;

  const ok = result.status === "success";
  const rejected = result.status === "rejected";
  const color = ok
    ? "border-accent-green/50 bg-accent-green/10 text-accent-green"
    : rejected
      ? "border-foreground/30 bg-card-bg text-foreground/60"
      : "border-accent-red/50 bg-accent-red/10 text-accent-red";

  const label = ok
    ? "✓ ACTION CONFIRMED"
    : rejected
      ? "— REJECTED"
      : "✗ ACTION FAILED";

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded border p-3 space-y-1 shadow-lg ${color}`}
      role="status"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-pixel)] text-[10px]">
          {label}
        </span>
        <button
          onClick={onDismiss}
          className="text-[10px] opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {result.hash && (
        <a
          href={`${SHAPE_EXPLORER}/tx/${result.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] font-[family-name:var(--font-mono)] break-all hover:underline"
        >
          {result.hash}
        </a>
      )}
      {result.signature && (
        <div className="text-[10px] font-[family-name:var(--font-mono)] break-all">
          sig: {result.signature.slice(0, 24)}…
        </div>
      )}
      {result.error && (
        <div className="text-[10px] font-[family-name:var(--font-mono)] text-foreground/60 leading-relaxed">
          {result.error}
        </div>
      )}
    </div>
  );
}
