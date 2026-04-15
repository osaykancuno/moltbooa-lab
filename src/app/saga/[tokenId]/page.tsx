"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import SagaView from "@/components/SagaView";
import { fetchFullBOOA } from "@/lib/khora-api";
import { simulate, getCurrentWeek } from "@/lib/simulation-engine";
import type { FullBOOAData, SimulationResult } from "@/types";

const SAGA_LENGTH = 4;

export default function SagaPage() {
  const params = useParams();
  const tokenId = params.tokenId as string;

  const [data, setData] = useState<FullBOOAData | null>(null);
  const [weeks, setWeeks] = useState<SimulationResult[]>([]);
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

        const currentWeek = getCurrentWeek();
        const scores = fullData.agentCard?.scores ?? null;
        const sims: SimulationResult[] = [];
        for (let i = 0; i < SAGA_LENGTH; i++) {
          sims.push(simulate(fullData.traits, scores, tokenId, currentWeek + i));
        }
        if (!cancelled) setWeeks(sims);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load BOOA data"
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
              LOADING SAGA
            </div>
            <p className="text-[10px] text-foreground/40 font-[family-name:var(--font-mono)]">
              Simulating {SAGA_LENGTH} weeks for BOOA #{tokenId}...
            </p>
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
              BACK
            </a>
          </div>
        )}
        {!loading && !error && data && weeks.length > 0 && (
          <SagaView data={data} weeks={weeks} tokenId={tokenId} />
        )}
      </main>
    </>
  );
}
