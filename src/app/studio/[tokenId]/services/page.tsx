"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import OwnershipGate from "@/components/studio/OwnershipGate";
import Steps from "@/components/studio/Steps";
import { fetchAgentCard } from "@/lib/agent-card";
import { KHORA_BRIDGE_URL } from "@/lib/constants";
import type { AgentOnChainState } from "@/types/studio";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

/**
 * Services read-only view.
 *
 * DESIGN NOTE
 * ───────────
 * We don't ship a standalone services editor (plan non-goal: no agent-to-
 * agent marketplace). Services are auto-derived from the BOOA's traits
 * (skill + domain) at registration time and re-signed via Khôra Bridge
 * whenever the owner updates the identity. This page is the cockpit's
 * SERVICES detail view: it shows what's advertised on-chain today and
 * points at khora.fun/bridge for any change.
 */
export default function ServicesPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  const valid = isValidTokenId(tokenId);

  const [state, setState] = useState<Omit<AgentOnChainState, "owner"> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!valid) {
      setError("Invalid token ID. Must be 0–3332.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchAgentCard(tokenId)
      .then((c) => {
        if (!cancelled) setState(c);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
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
            SERVICES
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            BOOA #{tokenId}
          </p>
        </div>

        {!valid && (
          <div className="text-center py-16 text-sm text-accent-red">{error}</div>
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
              if (error || !state) {
                return (
                  <div className="text-center py-10 text-sm text-accent-red">
                    {error || "Could not load services."}
                  </div>
                );
              }

              const services = state.registration?.services ?? [];

              return (
                <div className="space-y-8">
                  <Steps
                    heading="── WHAT ARE SERVICES? ──"
                    steps={[
                      {
                        title: "WHAT OTHER AGENTS SEE",
                        status: "current",
                        body: (
                          <>
                            A service is a skill you advertise on-chain via
                            ERC-8004. Other agents (and indexers like Khôra)
                            use these to decide if your BOOA is a good match
                            for a job.
                          </>
                        ),
                      },
                      {
                        title: "AUTO-DERIVED FROM TRAITS",
                        body: (
                          <>
                            By default, we publish one service built from
                            your BOOA&apos;s <code>skill</code> and{" "}
                            <code>domain</code> traits. No extra form to
                            fill.
                          </>
                        ),
                      },
                      {
                        title: "EDITED VIA KHÔRA BRIDGE",
                        body: (
                          <>
                            To change the list, open{" "}
                            <a
                              href={KHORA_BRIDGE_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-cyan hover:underline"
                            >
                              khora.fun/bridge ↗
                            </a>{" "}
                            — it re-signs the whole agent record (identity
                            + services) in a single Shape tx.
                          </>
                        ),
                      },
                    ]}
                  />

                  <section className="space-y-3">
                    <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple">
                      DECLARED ON-CHAIN ({services.length})
                    </h3>

                    {services.length === 0 ? (
                      <div className="rounded border border-card-border bg-card-bg p-5 text-center space-y-2">
                        <p className="text-[11px] text-foreground/60">
                          No services declared yet. Register your BOOA to
                          publish the default service derived from its
                          traits.
                        </p>
                        <a
                          href={KHORA_BRIDGE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[10px] px-4 py-2 mt-1 rounded border bg-accent-purple/15 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/25 font-[family-name:var(--font-pixel)]"
                        >
                          REGISTER ON KHÔRA ↗
                        </a>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {services.map((svc, i) => (
                          <li
                            key={`${svc.name}-${i}`}
                            className="rounded border border-card-border bg-card-bg p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-[family-name:var(--font-pixel)] text-[11px] text-accent-cyan">
                                {svc.name}
                              </div>
                              {svc.version && (
                                <span className="text-[10px] text-foreground/50 font-[family-name:var(--font-mono)]">
                                  v{svc.version}
                                </span>
                              )}
                            </div>
                            {svc.skills && svc.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {svc.skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-[family-name:var(--font-pixel)]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {svc.domains && svc.domains.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {svc.domains.map((d) => (
                                  <span
                                    key={d}
                                    className="text-[10px] px-2 py-0.5 rounded bg-accent-green/10 border border-accent-green/30 text-accent-green font-[family-name:var(--font-pixel)]"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}
                            {svc.endpoint && (
                              <div
                                className="text-[10px] text-foreground/50 font-[family-name:var(--font-mono)] truncate"
                                title={svc.endpoint}
                              >
                                → {svc.endpoint}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {services.length > 0 && (
                    <section className="rounded border border-accent-purple/30 bg-accent-purple/5 p-4 space-y-2">
                      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple">
                        NEED TO CHANGE THEM?
                      </h3>
                      <p className="text-[11px] text-foreground/60 leading-relaxed">
                        Open Khôra Bridge — it re-signs the whole agent
                        record (identity + services) in a single Shape
                        transaction.
                      </p>
                      <a
                        href={KHORA_BRIDGE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[10px] px-3 py-1.5 rounded border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 font-[family-name:var(--font-pixel)]"
                      >
                        OPEN KHÔRA BRIDGE ↗
                      </a>
                    </section>
                  )}

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
