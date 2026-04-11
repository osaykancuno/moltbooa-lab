"use client";

import type { SimulationResult } from "@/types";

export default function FutureSelfCard({ sim }: { sim: SimulationResult }) {
  return (
    <div className="gradient-border p-4 rounded-lg">
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple mb-3">
        FUTURE LORE — YOUR BOOA IN 30 DAYS
      </h3>
      <p className="text-sm leading-relaxed text-foreground/80 italic">
        &quot;{sim.futureLore}&quot;
      </p>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-foreground/40">
        <span className="px-2 py-0.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full">
          Week #{sim.weekSeed}
        </span>
        <span>Deterministic seed — check back next week for new lore</span>
      </div>
    </div>
  );
}
