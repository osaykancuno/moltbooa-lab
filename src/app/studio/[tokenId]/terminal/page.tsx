"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import OwnershipGate from "@/components/studio/OwnershipGate";
import AgentTerminalChat from "@/components/studio/AgentTerminalChat";
import { fetchAgentCard } from "@/lib/agent-card";
import { fetchFullBOOA } from "@/lib/khora-api";
import type { AgentOnChainState } from "@/types/studio";
import type { FullBOOAData } from "@/types";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

export default function TerminalPage({
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!valid) {
      setError("Invalid token ID. Must be 0–3332.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([fetchAgentCard(tokenId), fetchFullBOOA(tokenId)])
      .then(([card, full]) => {
        if (cancelled) return;
        setState(card);
        setBooa(full);
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

  const endpointUrl = state?.endpointUrl ?? null;
  const agentName = booa?.traits.name ?? `BOOA #${tokenId}`;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/studio/${tokenId}`}
            className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
          >
            ← COCKPIT
          </Link>
          <WalletConnect />
        </div>

        <div className="text-center space-y-2 mb-6">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            TERMINAL
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            {agentName} · BOOA #{tokenId}
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
              <div className="space-y-4">
                {loading && (
                  <div className="text-center py-10 text-[10px] text-foreground/60 font-[family-name:var(--font-pixel)]">
                    LOADING AGENT STATE…
                  </div>
                )}

                {!loading && error && (
                  <div className="text-center py-10 space-y-2">
                    <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
                      ERROR
                    </div>
                    <p className="text-sm text-foreground/60">{error}</p>
                  </div>
                )}

                {!loading && !error && !endpointUrl && (
                  <div className="text-center py-10 space-y-3 max-w-md mx-auto">
                    <div className="font-[family-name:var(--font-pixel)] text-[11px] text-accent-red">
                      ENDPOINT NOT SET
                    </div>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">
                      The terminal drives your agent through its live endpoint.
                      Deploy or link one first.
                    </p>
                    <Link
                      href={`/studio/${tokenId}/endpoint`}
                      className="inline-block text-[10px] px-4 py-2 rounded border bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 font-[family-name:var(--font-pixel)]"
                    >
                      SET ENDPOINT →
                    </Link>
                  </div>
                )}

                {!loading && !error && endpointUrl && (
                  <>
                    <div className="rounded border border-accent-purple/30 bg-accent-purple/5 p-3 text-[10px] text-foreground/70 leading-relaxed font-[family-name:var(--font-mono)]">
                      <span className="font-[family-name:var(--font-pixel)] text-[9px] text-accent-purple mr-1">
                        HOW ·
                      </span>
                      Your agent can <span className="text-accent-cyan">propose</span>{" "}
                      on-chain actions (tx, contract calls, signatures). You
                      review each one, then sign in your wallet. Nothing runs
                      without your click. No private key ever leaves your
                      browser.
                    </div>

                    <AgentTerminalChat
                      tokenId={tokenId}
                      agentName={agentName}
                      endpointUrl={endpointUrl}
                    />
                  </>
                )}
              </div>
            )}
          </OwnershipGate>
        )}
      </main>
    </>
  );
}
