"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import BattleView from "@/components/BattleView";
import { fetchFullBOOA } from "@/lib/khora-api";
import { simulate } from "@/lib/simulation-engine";
import type { FullBOOAData, SimulationResult } from "@/types";

export default function BattlePage() {
  const params = useParams();
  const id1 = params.id1 as string;
  const id2 = params.id2 as string;

  const [data1, setData1] = useState<FullBOOAData | null>(null);
  const [data2, setData2] = useState<FullBOOAData | null>(null);
  const [sim1, setSim1] = useState<SimulationResult | null>(null);
  const [sim2, setSim2] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [d1, d2] = await Promise.all([
          fetchFullBOOA(id1),
          fetchFullBOOA(id2),
        ]);
        if (cancelled) return;
        setData1(d1);
        setData2(d2);
        setSim1(simulate(d1.traits, d1.agentCard?.scores ?? null, id1));
        setSim2(simulate(d2.traits, d2.agentCard?.scores ?? null, id2));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load BOOAs"
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
  }, [id1, id2]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-cyan glitch-text">
              LOADING BATTLE
            </div>
            <div className="text-[10px] text-foreground/40 font-[family-name:var(--font-mono)]">
              BOOA #{id1} vs BOOA #{id2}
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
              BACK
            </a>
          </div>
        )}
        {!loading && !error && data1 && data2 && sim1 && sim2 && (
          <BattleView data1={data1} sim1={sim1} data2={data2} sim2={sim2} />
        )}
      </main>
    </>
  );
}
