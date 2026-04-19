"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import OwnershipGate from "@/components/studio/OwnershipGate";
import Steps from "@/components/studio/Steps";
import EndpointTemplateDownload from "@/components/studio/EndpointTemplateDownload";
import EndpointTester from "@/components/studio/EndpointTester";
import AllowedOriginHint from "@/components/studio/AllowedOriginHint";
import { fetchAgentCard } from "@/lib/agent-card";
import { fetchFullBOOA } from "@/lib/khora-api";
import { validateEndpointUrl } from "@/lib/endpoint-validator";
import { KHORA_BRIDGE_URL } from "@/lib/constants";
import type { AgentOnChainState } from "@/types/studio";
import type { FullBOOAData } from "@/types";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

export default function EndpointPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  const valid = isValidTokenId(tokenId);

  const [state, setState] = useState<Omit<AgentOnChainState, "owner"> | null>(
    null
  );
  const [booa, setBooa] = useState<FullBOOAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [urlInput, setUrlInput] = useState("");
  const validation = urlInput ? validateEndpointUrl(urlInput) : null;

  useEffect(() => {
    if (!valid) {
      setLoadError("Invalid token ID. Must be 0–3332.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([fetchAgentCard(tokenId), fetchFullBOOA(tokenId)])
      .then(([card, full]) => {
        if (cancelled) return;
        setState(card);
        setBooa(full);
        if (card.endpointUrl) setUrlInput(card.endpointUrl);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId, valid]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/studio/${tokenId}`}
            className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
          >
            ← COCKPIT
          </Link>
          <WalletConnect />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            AGENT ENDPOINT
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            BOOA #{tokenId}
          </p>
        </div>

        {!valid && (
          <div className="text-center py-16 text-sm text-accent-red">
            {loadError}
          </div>
        )}

        {valid && (
          <OwnershipGate tokenId={tokenId}>
            {() => {
              if (loading) {
                return (
                  <div className="text-center py-10 text-[10px] text-foreground/60 font-[family-name:var(--font-pixel)]">
                    LOADING…
                  </div>
                );
              }
              if (loadError || !state || !booa) {
                return (
                  <div className="text-center py-10 text-sm text-accent-red">
                    {loadError || "Could not load agent state."}
                  </div>
                );
              }
              return (
                <div className="space-y-8">
                  <Steps
                    heading="── WHAT IS AN ENDPOINT? ──"
                    steps={[
                      {
                        title: "A URL YOU OWN",
                        status: "current",
                        body: (
                          <>
                            Your BOOA&apos;s public chat on{" "}
                            <code className="text-accent-cyan">
                              /agent/{tokenId}
                            </code>{" "}
                            calls your endpoint. You host it — we never touch
                            your LLM keys.
                          </>
                        ),
                      },
                      {
                        title: "FREE TO DEPLOY",
                        body: (
                          <>
                            A tiny Next.js route handler fits Vercel hobby /
                            Cloudflare Workers free tier. Download the template
                            below — it&apos;s pre-filled with your BOOA.
                          </>
                        ),
                      },
                      {
                        title: "SAVED ON-CHAIN",
                        body: (
                          <>
                            The URL lives in your ERC-8004 record via Khôra —
                            updating it is a single Shape transaction.
                          </>
                        ),
                      },
                    ]}
                  />

                  <section className="rounded border border-card-border bg-card-bg p-5 space-y-3">
                    <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
                      A · ALREADY HAVE AN ENDPOINT?
                    </h3>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">
                      Paste its URL. We check the shape locally first (https,
                      no localhost / private ranges, no embedded credentials).
                      Then you sign on Khôra to save it on-chain.
                    </p>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://your-agent.vercel.app"
                      className="w-full text-xs px-3 py-2 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60 font-[family-name:var(--font-mono)]"
                    />
                    {validation && !validation.ok && (
                      <p className="text-[10px] text-accent-red font-[family-name:var(--font-mono)]">
                        ✗ {validation.reason}
                      </p>
                    )}
                    {validation && validation.ok && (
                      <p className="text-[10px] text-accent-green font-[family-name:var(--font-mono)]">
                        ✓ URL shape looks safe
                      </p>
                    )}
                    {validation && validation.ok && (
                      <EndpointTester
                        url={urlInput}
                        expectedTokenId={tokenId}
                      />
                    )}
                    <AllowedOriginHint />
                    <a
                      href={KHORA_BRIDGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!(validation && validation.ok)}
                      className={`inline-block text-[10px] px-4 py-2 rounded border font-[family-name:var(--font-pixel)] transition-all ${
                        validation && validation.ok
                          ? "bg-accent-green/15 border-accent-green/50 text-accent-green hover:bg-accent-green/25"
                          : "bg-card-bg border-card-border text-foreground/30 pointer-events-none"
                      }`}
                    >
                      SAVE ON-CHAIN VIA KHÔRA ↗
                    </a>
                  </section>

                  <section className="rounded border border-accent-purple/30 bg-accent-purple/5 p-5 space-y-3">
                    <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple">
                      B · DON&apos;T HAVE ONE YET?
                    </h3>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">
                      Download a complete Next.js endpoint, pre-filled with
                      this BOOA&apos;s identity. Already wired to read its
                      own live ERC-8004 state from the Khôra public API on
                      every turn — optional tool calling lets it query
                      other BOOAs too. Deploy on Vercel / Netlify /
                      Cloudflare (all free-tier friendly), then come back
                      here and paste the URL above.
                    </p>

                    <EndpointTemplateDownload booa={booa} />

                    <details className="pt-1">
                      <summary className="text-[10px] text-foreground/40 cursor-pointer hover:text-foreground/70 font-[family-name:var(--font-pixel)]">
                        WHAT&apos;S IN THE ZIP?
                      </summary>
                      <ul className="text-[10px] text-foreground/50 leading-relaxed mt-2 pl-4 list-disc space-y-0.5">
                        <li>
                          <code className="text-accent-cyan">app/chat/route.ts</code>{" "}
                          — the <code className="text-accent-cyan">POST /chat</code>{" "}
                          handler your BOOA page calls.
                        </li>
                        <li>
                          <code className="text-accent-cyan">lib/khora.ts</code>{" "}
                          — public Khôra API client. Reads your live agent
                          card, scores, services, and any other BOOA on-demand.
                        </li>
                        <li>
                          <code className="text-accent-cyan">lib/tools.ts</code>{" "}
                          — opt-in OpenAI tool schemas (<code>get_booa</code>,{" "}
                          <code>get_agent_card</code>,{" "}
                          <code>get_gallery_top</code>). Enable via{" "}
                          <code>TOOLS_ENABLED=true</code>.
                        </li>
                        <li>
                          <code className="text-accent-cyan">soul.md</code> —
                          editable personality file (your BOOA&apos;s traits
                          are already baked in).
                        </li>
                        <li>
                          <code className="text-accent-cyan">.env.example</code>{" "}
                          — placeholders for <code>LLM_API_BASE</code>,{" "}
                          <code>LLM_API_KEY</code>, <code>LLM_MODEL</code>. No
                          real keys ever ship in the ZIP.
                        </li>
                        <li>
                          <code className="text-accent-cyan">README.md</code>{" "}
                          with a 3-step deploy guide (Vercel CLI, no GitHub
                          needed).
                        </li>
                      </ul>
                    </details>

                    <p className="text-[10px] text-foreground/40 pt-2 border-t border-card-border">
                      Alternatively, start from the Lab export:{" "}
                      <Link
                        href={`/simulate/${tokenId}`}
                        className="text-accent-purple hover:underline"
                      >
                        /simulate/{tokenId} →
                      </Link>
                    </p>
                  </section>

                  <div className="pt-4 border-t border-card-border text-center">
                    <Link
                      href={`/studio/${tokenId}`}
                      className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
                    >
                      ← BACK TO COCKPIT
                    </Link>
                  </div>
                </div>
              );
            }}
          </OwnershipGate>
        )}
      </main>
    </>
  );
}
