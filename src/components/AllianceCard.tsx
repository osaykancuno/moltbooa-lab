"use client";

import type { SimulatedAlly } from "@/types";

export default function AllianceCard({ ally }: { ally: SimulatedAlly }) {
  return (
    <div className="bg-card-bg border border-accent-green/20 rounded-lg p-3 hover:border-accent-green/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-accent-green/20 flex items-center justify-center text-[8px] font-[family-name:var(--font-pixel)] text-accent-green">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-accent-green">
            {ally.name}
            <span className="text-foreground/40 font-normal ml-1">
              {ally.tokenId}
            </span>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-foreground/50 space-y-1">
        <div>
          Domain:{" "}
          <span className="text-accent-cyan">{ally.domain}</span>
        </div>
        <div className="text-foreground/30 truncate">{ally.creature}</div>
      </div>
    </div>
  );
}
