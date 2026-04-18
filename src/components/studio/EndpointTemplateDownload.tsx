"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import type { FullBOOAData } from "@/types";
import { generateEndpointTemplate } from "@/lib/endpoint-template/generate";

interface Props {
  booa: FullBOOAData;
}

/**
 * Generates and downloads a personalized agent endpoint ZIP for this BOOA.
 * Fully client-side: JSZip builds the archive in memory, then file-saver
 * triggers a browser download. Our server never sees the bundle.
 */
export default function EndpointTemplateDownload({ booa }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function onDownload() {
    setBusy(true);
    setErr("");
    setDone(false);
    try {
      const blob = await generateEndpointTemplate(booa);
      const slug =
        booa.traits.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 40) || `booa-${booa.token.tokenId}`;
      saveAs(blob, `${slug}.zip`);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className="inline-block text-[10px] px-4 py-2 rounded border border-accent-purple/50 bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-pixel)] transition-all"
      >
        {busy ? "BUILDING ZIP…" : "DOWNLOAD ENDPOINT TEMPLATE ↓"}
      </button>

      {done && (
        <p className="text-[10px] text-accent-green font-[family-name:var(--font-mono)]">
          ✓ Saved. Open the README inside the ZIP for a 3-step deploy guide.
        </p>
      )}
      {err && (
        <p className="text-[10px] text-accent-red font-[family-name:var(--font-mono)]">
          ✗ {err}
        </p>
      )}

      <ul className="text-[10px] text-foreground/50 leading-relaxed list-disc list-inside space-y-0.5">
        <li>Pre-filled with your BOOA&apos;s traits (name, skill, vibe, lore).</li>
        <li>Provider-agnostic: OpenRouter, Groq, OpenAI — pick any with a free tier.</li>
        <li>
          No keys inside. Only <code className="text-accent-cyan">.env.example</code>{" "}
          placeholders.
        </li>
        <li>CORS, 20 req/min rate limit, 30s timeout, no prompt logging — by default.</li>
      </ul>
    </div>
  );
}
