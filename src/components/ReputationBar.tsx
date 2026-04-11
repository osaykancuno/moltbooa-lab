"use client";

import type { SimulationResult } from "@/types";

export default function ReputationBar({ sim }: { sim: SimulationResult }) {
  const maxRep = 100;
  const pct = Math.min((sim.totalReputation / maxRep) * 100, 100);

  const color =
    sim.totalReputation > 50
      ? "bg-accent-yellow"
      : sim.totalReputation > 30
        ? "bg-accent-green"
        : "bg-accent-cyan";

  return (
    <div className="gradient-border p-4 rounded-lg">
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan mb-3">
        REPUTATION GAIN
      </h3>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-4 bg-black/60 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} animate-fill rounded-full`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-foreground/50">
            <span>0</span>
            <span>+{sim.totalReputation} rep</span>
            <span>{maxRep}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-[family-name:var(--font-pixel)] text-lg text-accent-green">
            +{sim.totalReputation}
          </div>
          <div className="text-[10px] text-foreground/40">
            #{sim.rankBefore} → #{sim.rankAfter}
          </div>
        </div>
      </div>
    </div>
  );
}
