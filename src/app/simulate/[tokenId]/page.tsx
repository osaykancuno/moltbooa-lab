"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import SimulationView from "@/components/SimulationView";
import { fetchFullBOOA } from "@/lib/khora-api";
import { simulate } from "@/lib/simulation-engine";
import type { FullBOOAData, SimulationResult } from "@/types";

export default function SimulatePage() {
  const params = useParams();
  const tokenId = params.tokenId as string;

  const [data, setData] = useState<FullBOOAData | null>(null);
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const fullData = await fetchFullBOOA(tokenId);
        if (cancelled) return;
        setData(fullData);

        const scores = fullData.agentCard?.scores ?? null;
        const result = simulate(fullData.traits, scores, tokenId);
        setSim(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load BOOA data. Check the Token ID and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-cyan glitch-text">
              LOADING BOOA #{tokenId}
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent-purple animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <div className="text-[10px] text-foreground/30 font-[family-name:var(--font-mono)] space-y-1 text-center">
              <p>Fetching on-chain data from Shape Network...</p>
              <p>Reading SSTORE2 bitmap and traits...</p>
              <p>Checking ERC-8004 registration...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
              ERROR
            </div>
            <p className="text-sm text-foreground/60 text-center max-w-md">
              {error}
            </p>
            <a
              href="/"
              className="text-[10px] px-4 py-2 bg-accent-purple/20 border border-accent-purple/40 text-accent-purple rounded hover:bg-accent-purple/30 transition-all font-[family-name:var(--font-pixel)]"
            >
              TRY ANOTHER
            </a>
          </div>
        )}

        {!loading && !error && data && sim && (
          <SimulationView sim={sim} data={data} tokenId={tokenId} />
        )}
      </main>
    </>
  );
}
