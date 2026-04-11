"use client";

import type { SimulationResult } from "@/types";

// C64 palette colors to cycle through each week
const C64_PALETTE = [
  { bg: "bg-accent-purple/15", border: "border-accent-purple/40", text: "text-accent-purple" },
  { bg: "bg-accent-cyan/15", border: "border-accent-cyan/40", text: "text-accent-cyan" },
  { bg: "bg-accent-green/15", border: "border-accent-green/40", text: "text-accent-green" },
  { bg: "bg-accent-yellow/15", border: "border-accent-yellow/40", text: "text-accent-yellow" },
  { bg: "bg-accent-red/15", border: "border-accent-red/40", text: "text-accent-red" },
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

export default function WeeklyBadge({ sim }: { sim: SimulationResult }) {
  const weekNumber = getWeekNumber();
  const palette = C64_PALETTE[weekNumber % C64_PALETTE.length];
  const hexSeed = (sim.weekSeed >>> 0).toString(16).padStart(8, "0");

  return (
    <div
      className={`${palette.bg} border ${palette.border} rounded-lg p-4 text-center`}
    >
      {/* Badge icon area */}
      <div className="flex justify-center mb-3">
        <div
          className={`w-16 h-16 rounded-lg border-2 ${palette.border} ${palette.bg} flex items-center justify-center`}
          style={{ imageRendering: "pixelated" }}
        >
          <span
            className={`font-[family-name:var(--font-pixel)] text-lg ${palette.text}`}
          >
            W{weekNumber}
          </span>
        </div>
      </div>

      <div
        className={`font-[family-name:var(--font-pixel)] text-[10px] ${palette.text} mb-1`}
      >
        WEEK #{weekNumber} SIMULATION
      </div>

      <div className="text-[9px] text-foreground/40 font-mono mb-3">
        Seed: 0x{hexSeed}
      </div>

      <div className="text-[9px] text-foreground/30 italic">
        Come back next week for a new simulation!
      </div>
    </div>
  );
}
