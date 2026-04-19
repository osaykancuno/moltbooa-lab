"use client";

import { useEffect, useState } from "react";

/**
 * Tiny helper that shows the holder exactly what value to set as
 * ALLOWED_ORIGIN on their endpoint so this Moltbook deployment can talk to it.
 *
 * Rendered inline on /studio/[tokenId]/endpoint below the URL input: the #1
 * foot-gun when going from "*" (dev) to a restricted CORS origin is typing
 * the wrong string. We compute it from window.location.origin and expose a
 * copy-to-clipboard button.
 */
export default function AllowedOriginHint() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function copy() {
    if (!origin) return;
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (non-https dev, older browsers) — ignore
    }
  }

  if (!origin) return null;

  return (
    <div className="rounded border border-card-border bg-background/50 p-2.5 space-y-1.5">
      <div className="text-[10px] text-foreground/60 font-[family-name:var(--font-mono)] leading-relaxed">
        Going public? Set{" "}
        <code className="text-accent-cyan">ALLOWED_ORIGIN</code> on your
        endpoint to:
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[10px] px-2 py-1 rounded bg-background border border-card-border text-accent-green font-[family-name:var(--font-mono)] truncate">
          {origin}
        </code>
        <button
          type="button"
          onClick={copy}
          className="text-[9px] px-2 py-1 rounded border border-card-border text-foreground/70 hover:text-foreground hover:bg-card-bg font-[family-name:var(--font-pixel)] shrink-0"
        >
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-mono)]">
        Default <code>*</code> works for testing but anyone can embed your
        endpoint in their site.
      </div>
    </div>
  );
}
