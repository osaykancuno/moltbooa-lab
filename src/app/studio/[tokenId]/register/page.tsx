"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import OwnershipGate from "@/components/studio/OwnershipGate";
import RegisterWizard from "@/components/studio/RegisterWizard";
import { fetchAgentCard } from "@/lib/agent-card";
import { fetchFullBOOA } from "@/lib/khora-api";
import type { AgentOnChainState } from "@/types/studio";
import type { FullBOOAData } from "@/types";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

export default function RegisterPage({
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
    async function load() {
      setLoading(true);
      try {
        const [card, full] = await Promise.all([
          fetchAgentCard(tokenId),
          fetchFullBOOA(tokenId),
        ]);
        if (cancelled) return;
        setState(card);
        setBooa(full);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
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
            href={`/studio/${tokenId}`}
            className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
          >
            ← COCKPIT
          </Link>
          <WalletConnect />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            REGISTER ON ERC-8004
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            BOOA #{tokenId}
          </p>
        </div>

        {!valid && (
          <div className="text-center py-16 text-sm text-accent-red">
            {error}
          </div>
        )}

        {valid && (
          <OwnershipGate tokenId={tokenId}>
            {({ owner }) => {
              if (loading) {
                return (
                  <div className="text-center py-10 text-[10px] text-foreground/60 font-[family-name:var(--font-pixel)]">
                    LOADING AGENT DATA…
                  </div>
                );
              }
              if (error || !state || !booa) {
                return (
                  <div className="text-center py-10 space-y-2">
                    <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
                      ERROR
                    </div>
                    <p className="text-sm text-foreground/60">
                      {error || "Could not load agent data."}
                    </p>
                  </div>
                );
              }
              return (
                <RegisterWizard
                  tokenId={tokenId}
                  owner={owner}
                  state={state}
                  booa={booa}
                />
              );
            }}
          </OwnershipGate>
        )}
      </main>
    </>
  );
}
