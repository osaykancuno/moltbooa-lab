"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import OwnershipGate from "@/components/studio/OwnershipGate";
import AgentStatusCard from "@/components/studio/AgentStatusCard";
import { fetchAgentCard } from "@/lib/agent-card";
import { KHORA_BRIDGE_URL } from "@/lib/constants";
import type { AgentOnChainState } from "@/types/studio";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

export default function CockpitPage({
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
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAgentCard(tokenId);
        if (!cancelled) setState(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load BOOA");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
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
            href="/studio"
            className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
          >
            ← STUDIO
          </Link>
          <WalletConnect />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            COCKPIT
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            BOOA #{tokenId}
          </p>
        </div>

        {!valid && (
          <div className="text-center py-16 space-y-2">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
              ERROR
            </div>
            <p className="text-sm text-foreground/60">{error}</p>
          </div>
        )}

        {valid && (
          <OwnershipGate tokenId={tokenId}>
            {() => (
              <div className="space-y-6">
                {loading && (
                  <div className="text-center py-10 text-[10px] text-foreground/60 font-[family-name:var(--font-pixel)]">
                    LOADING AGENT STATE…
                  </div>
                )}

                {error && (
                  <div className="text-center py-10 space-y-2">
                    <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
                      ERROR
                    </div>
                    <p className="text-sm text-foreground/60">{error}</p>
                  </div>
                )}

                {!loading && !error && state && (
                  <AgentStatusCard
                    state={{
                      ...state,
                      // owner is already verified by OwnershipGate; we don't
                      // need to surface it in the card.
                      owner: null,
                    }}
                  />
                )}

                {!loading && !error && state && (
                  <div className="rounded border border-card-border bg-card-bg/40 p-4 text-[11px] text-foreground/60 leading-relaxed space-y-2">
                    <p>
                      <span className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/50">
                        TIP ·{" "}
                      </span>
                      Work through the ACTIONS above in order. The current
                      step is highlighted in purple — click it.
                    </p>
                    <p className="text-foreground/40">
                      Progress updates automatically as transactions confirm
                      on-chain (may take 10–30 seconds).
                    </p>
                    <p className="text-foreground/40 pt-1 border-t border-card-border">
                      <span className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/50">
                        HOW THIS WORKS ·{" "}
                      </span>
                      Identity lives on ERC-8004 and is registered via the
                      official community tool{" "}
                      <a
                        href={KHORA_BRIDGE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-cyan hover:underline"
                      >
                        khora.fun/bridge ↗
                      </a>
                      . Moltbook Studio handles everything else — deploying
                      the agent endpoint and running the public chat.
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t border-card-border">
                  <Link
                    href={`/simulate/${tokenId}`}
                    className="text-[10px] text-foreground/50 hover:text-accent-cyan font-[family-name:var(--font-pixel)]"
                  >
                    ↗ SIMULATE THIS BOOA IN THE LAB
                  </Link>
                </div>
              </div>
            )}
          </OwnershipGate>
        )}
      </main>
    </>
  );
}
