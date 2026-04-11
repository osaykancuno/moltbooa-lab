"use client";

import { useEffect, useState } from "react";
import type { SimulationResult } from "@/types";

function getRank(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "S", color: "text-accent-cyan" };
  if (score >= 75) return { label: "A", color: "text-accent-green" };
  if (score >= 50) return { label: "B", color: "text-accent-purple" };
  if (score >= 25) return { label: "C", color: "text-accent-yellow" };
  return { label: "D", color: "text-accent-red" };
}

function getGlowClass(score: number): string {
  if (score >= 90) return "glow-cyan";
  if (score >= 75) return "glow-green";
  return "glow-purple";
}

function getBorderGradient(score: number): string {
  if (score >= 90) return "from-accent-cyan to-accent-green";
  if (score >= 75) return "from-accent-green to-accent-cyan";
  if (score >= 50) return "from-accent-purple to-accent-cyan";
  if (score >= 25) return "from-accent-yellow to-accent-purple";
  return "from-accent-red to-accent-yellow";
}

export function computePowerScore(sim: SimulationResult): number {
  return Math.min(
    100,
    Math.floor(
      sim.totalReputation * 0.4 +
        sim.services.filter((s) => s.completed).length * 15 +
        sim.alliances.length * 10 +
        (sim.scores?.overall ?? 30) * 0.3 +
        (sim.rankBefore > sim.rankAfter ? 10 : 0)
    )
  );
}

export default function PowerScore({ sim }: { sim: SimulationResult }) {
  const finalScore = computePowerScore(sim);
  const [displayScore, setDisplayScore] = useState(0);
  const rank = getRank(finalScore);
  const glowClass = getGlowClass(finalScore);
  const borderGradient = getBorderGradient(finalScore);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 60;
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * finalScore));
      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayScore(finalScore);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [finalScore]);

  const completedServices = sim.services.filter((s) => s.completed).length;

  return (
    <div className="gradient-border p-6 rounded-lg animate-fade-in">
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan text-center mb-4">
        BOOA POWER SCORE
      </h3>

      {/* Circular score display */}
      <div className="flex justify-center mb-4">
        <div className={`relative ${glowClass}`}>
          {/* Gradient ring */}
          <div
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full p-[3px] bg-gradient-to-br ${borderGradient}`}
          >
            <div className="w-full h-full rounded-full bg-card-bg flex flex-col items-center justify-center">
              <span
                className={`font-[family-name:var(--font-pixel)] text-3xl sm:text-4xl ${rank.color}`}
              >
                {displayScore}
              </span>
              <span className="text-[10px] text-foreground/40 mt-1">/ 100</span>
            </div>
          </div>
          {/* Rank badge */}
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card-bg border border-card-border font-[family-name:var(--font-pixel)] text-xs ${rank.color}`}
          >
            RANK {rank.label}
          </div>
        </div>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-4 gap-2 mt-6">
        <div className="text-center">
          <div className="text-[8px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            REP
          </div>
          <div className="text-xs text-accent-green font-bold">
            +{sim.totalReputation}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            SVC
          </div>
          <div className="text-xs text-accent-cyan font-bold">
            {completedServices}/{sim.services.length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            ALLY
          </div>
          <div className="text-xs text-accent-purple font-bold">
            {sim.alliances.length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            RANK
          </div>
          <div className="text-xs text-accent-yellow font-bold">
            #{sim.rankAfter}
          </div>
        </div>
      </div>
    </div>
  );
}
