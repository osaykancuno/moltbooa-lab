"use client";

import { useState } from "react";
import { validateEndpointUrl } from "@/lib/endpoint-validator";

interface HealthResponse {
  ok?: boolean;
  tokenId?: string;
  configured?: { llmBase: boolean; llmKey: boolean; llmModel: boolean };
  toolsEnabled?: boolean;
  onChain?: { ok: boolean; preview: string };
}

type Diag =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; data: HealthResponse; isOurTemplate: true }
  | { kind: "reachable"; status: number; isOurTemplate: false; note: string }
  | { kind: "cors" }
  | { kind: "timeout" }
  | { kind: "network"; message: string }
  | { kind: "invalid"; reason: string }
  | { kind: "http"; status: number; body: string }
  | { kind: "tokenMismatch"; expected: string; got: string; data: HealthResponse };

interface Props {
  url: string;
  expectedTokenId: string;
}

const TIMEOUT_MS = 8000;

/**
 * Lightweight probe against a holder-deployed endpoint.
 *
 * Calls `GET <url>/health` from the holder's browser — no LLM tokens burned,
 * no chat history leaked. The template's /health route mirrors the CORS
 * config of /chat, so a successful probe implies chat will also work from
 * Moltbook's origin.
 *
 * We decode common failure modes explicitly because "Failed to fetch" on its
 * own is useless: CORS, offline, DNS, and timeout all surface the same way
 * in browsers.
 */
export default function EndpointTester({ url, expectedTokenId }: Props) {
  const [diag, setDiag] = useState<Diag>({ kind: "idle" });

  async function runTest() {
    const v = validateEndpointUrl(url);
    if (!v.ok) {
      setDiag({ kind: "invalid", reason: v.reason });
      return;
    }
    setDiag({ kind: "testing" });

    const target = new URL("/health", v.url).toString();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(target, {
        method: "GET",
        signal: ac.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        mode: "cors",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setDiag({
          kind: "http",
          status: res.status,
          body: body.slice(0, 200),
        });
        return;
      }

      let data: HealthResponse | null = null;
      try {
        data = (await res.json()) as HealthResponse;
      } catch {
        setDiag({
          kind: "reachable",
          status: res.status,
          isOurTemplate: false,
          note: "Endpoint responded but /health did not return JSON. This is probably not a Moltbook template — chat may still work.",
        });
        return;
      }

      if (
        data &&
        typeof data.tokenId === "string" &&
        data.tokenId !== expectedTokenId
      ) {
        setDiag({
          kind: "tokenMismatch",
          expected: expectedTokenId,
          got: data.tokenId,
          data,
        });
        return;
      }

      if (data && typeof data.configured === "object") {
        setDiag({ kind: "ok", data, isOurTemplate: true });
        return;
      }

      setDiag({
        kind: "reachable",
        status: res.status,
        isOurTemplate: false,
        note: "Endpoint reachable — /health returned unexpected shape.",
      });
    } catch (err) {
      if (ac.signal.aborted) {
        setDiag({ kind: "timeout" });
        return;
      }
      // Browsers surface CORS and network failures both as TypeError:
      // "Failed to fetch". We can't distinguish them reliably, so we show
      // both probable causes.
      const msg = err instanceof Error ? err.message : String(err);
      if (/fetch|network/i.test(msg)) {
        setDiag({ kind: "cors" });
      } else {
        setDiag({ kind: "network", message: msg });
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const canTest = !!url && url.length > 7;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={runTest}
        disabled={!canTest || diag.kind === "testing"}
        className="text-[10px] px-3 py-1.5 rounded border font-[family-name:var(--font-pixel)] bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {diag.kind === "testing" ? "TESTING…" : "TEST ENDPOINT"}
      </button>
      <DiagOutput diag={diag} />
    </div>
  );
}

function DiagOutput({ diag }: { diag: Diag }) {
  if (diag.kind === "idle" || diag.kind === "testing") return null;

  const common = "text-[10px] font-[family-name:var(--font-mono)] leading-relaxed";

  if (diag.kind === "ok") {
    const c = diag.data.configured!;
    const allConfigured = c.llmBase && c.llmKey && c.llmModel;
    return (
      <div
        className={`${common} rounded border p-2 space-y-1 ${
          allConfigured
            ? "bg-accent-green/5 border-accent-green/40 text-accent-green"
            : "bg-accent-yellow/5 border-accent-yellow/40 text-accent-yellow"
        }`}
      >
        <div>
          {allConfigured ? "✓" : "⚠"} /health OK · tokenId=
          {diag.data.tokenId}
        </div>
        <div className="text-foreground/60">
          LLM_API_BASE={c.llmBase ? "set" : <strong>missing</strong>} ·
          LLM_API_KEY={c.llmKey ? "set" : <strong>missing</strong>} ·
          LLM_MODEL={c.llmModel ? "set" : <strong>missing</strong>}
        </div>
        <div className="text-foreground/60">
          tools={diag.data.toolsEnabled ? "on" : "off"} · on-chain snapshot=
          {diag.data.onChain?.ok ? "ok" : "unavailable"}
        </div>
        {!allConfigured && (
          <div>
            Add the missing env vars in your host dashboard and redeploy.
          </div>
        )}
      </div>
    );
  }

  if (diag.kind === "tokenMismatch") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red`}>
        ✗ Wrong BOOA. /health reports tokenId={diag.got}, but this cockpit is
        for #{diag.expected}. Did you paste the URL of another agent?
      </div>
    );
  }

  if (diag.kind === "reachable") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-yellow/5 border-accent-yellow/40 text-accent-yellow`}>
        ⚠ {diag.note}
      </div>
    );
  }

  if (diag.kind === "cors") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red space-y-1`}>
        <div>✗ Failed to fetch — most likely CORS or endpoint offline.</div>
        <div className="text-foreground/60">
          If the endpoint is deployed: make sure <code>ALLOWED_ORIGIN</code> is
          set to <code>{typeof window !== "undefined" ? window.location.origin : "*"}</code>{" "}
          (or <code>*</code> for testing) and redeploy.
        </div>
      </div>
    );
  }

  if (diag.kind === "timeout") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red`}>
        ✗ Timed out after 8s. Cold-start on serverless? Try again — or check
        your host&apos;s function logs.
      </div>
    );
  }

  if (diag.kind === "http") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red space-y-1`}>
        <div>
          ✗ HTTP {diag.status} from /health.
          {diag.status === 404 &&
            " — /health not found. Did you redeploy after downloading the latest template?"}
          {diag.status === 500 &&
            " — server error. Check host function logs."}
        </div>
        {diag.body && (
          <div className="text-foreground/50 break-all">{diag.body}</div>
        )}
      </div>
    );
  }

  if (diag.kind === "network") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red`}>
        ✗ {diag.message}
      </div>
    );
  }

  if (diag.kind === "invalid") {
    return (
      <div className={`${common} rounded border p-2 bg-accent-red/5 border-accent-red/40 text-accent-red`}>
        ✗ {diag.reason}
      </div>
    );
  }

  return null;
}
