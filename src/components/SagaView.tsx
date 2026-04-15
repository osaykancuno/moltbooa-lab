"use client";

import type { FullBOOAData, SimulationResult } from "@/types";
import { computePowerScore, getRank } from "@/lib/power-score";

export default function SagaView({
  data,
  weeks,
  tokenId,
}: {
  data: FullBOOAData;
  weeks: SimulationResult[];
  tokenId: string;
}) {
  const powers = weeks.map((w) => computePowerScore(w));
  const totalRep = weeks.reduce((sum, w) => sum + w.totalReputation, 0);
  const totalAlliances = weeks.reduce((sum, w) => sum + w.alliances.length, 0);
  const peakRank = Math.min(...weeks.map((w) => w.rankAfter));
  const finalPower = powers[powers.length - 1];
  const startPower = powers[0];
  const trend = finalPower - startPower;

  const maxPower = Math.max(...powers, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
          {data.traits.name} — SAGA
        </h1>
        <p className="text-xs text-foreground/50">
          BOOA #{tokenId} — 4-week arc
        </p>
      </div>

      {/* BOOA portrait */}
      {data.token.image && (
        <div className="flex justify-center">
          <div
            className="w-32 h-32 pixel-canvas rounded gradient-border"
            style={{
              backgroundImage: `url("${data.token.image}")`,
              backgroundSize: "cover",
              imageRendering: "pixelated",
            }}
          />
        </div>
      )}

      {/* Saga summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gradient-border rounded p-3 text-center">
          <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            TOTAL REP
          </div>
          <div className="text-xl text-accent-green font-bold">+{totalRep}</div>
        </div>
        <div className="gradient-border rounded p-3 text-center">
          <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            ALLIANCES
          </div>
          <div className="text-xl text-accent-purple font-bold">
            {totalAlliances}
          </div>
        </div>
        <div className="gradient-border rounded p-3 text-center">
          <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            PEAK RANK
          </div>
          <div className="text-xl text-accent-yellow font-bold">
            #{peakRank}
          </div>
        </div>
        <div className="gradient-border rounded p-3 text-center">
          <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            POWER TREND
          </div>
          <div
            className={`text-xl font-bold ${
              trend > 0
                ? "text-accent-green"
                : trend < 0
                  ? "text-accent-red"
                  : "text-foreground/60"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {trend}
          </div>
        </div>
      </div>

      {/* Power chart */}
      <div className="gradient-border p-4 rounded-lg">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan mb-4">
          POWER SCORE OVER TIME
        </h3>
        <div className="flex items-end justify-around gap-2 h-40">
          {powers.map((p, i) => {
            const rank = getRank(p);
            const heightPct = (p / maxPower) * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="text-xs font-bold"
                  style={{ color: rank.hex }}
                >
                  {p}
                </div>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: rank.hex,
                    boxShadow: `0 0 12px ${rank.hex}80`,
                    minHeight: "8px",
                  }}
                />
                <div className="text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
                  W{i === 0 ? "" : `+${i}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week-by-week breakdown */}
      <div className="space-y-3">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-yellow">
          WEEK BY WEEK
        </h3>
        {weeks.map((w, i) => {
          const power = powers[i];
          const rank = getRank(power);
          return (
            <div
              key={i}
              className="bg-card-bg border border-card-border rounded p-3"
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/60">
                  WEEK {i === 0 ? "CURRENT" : `+${i}`} (seed {w.weekSeed})
                </div>
                <div
                  className="text-[10px] font-[family-name:var(--font-pixel)] px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: rank.hex,
                    color: rank.hex,
                  }}
                >
                  {power} · {rank.label}
                </div>
              </div>
              <div className="grid grid-cols-3 text-[10px] gap-2">
                <div>
                  <span className="text-foreground/40">Rep:</span>{" "}
                  <span className="text-accent-green">
                    +{w.totalReputation}
                  </span>
                </div>
                <div>
                  <span className="text-foreground/40">Allies:</span>{" "}
                  <span className="text-accent-purple">
                    {w.alliances.length}
                  </span>
                </div>
                <div>
                  <span className="text-foreground/40">Rank:</span>{" "}
                  <span className="text-accent-yellow">
                    #{w.rankAfter}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-foreground/50 mt-2 italic leading-relaxed">
                {w.futureLore}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <a
          href={`/simulate/${tokenId}`}
          className="inline-block text-[10px] px-4 py-2 bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan rounded hover:bg-accent-cyan/30 transition-all font-[family-name:var(--font-pixel)]"
        >
          OPEN FULL SIMULATION
        </a>
      </div>
    </div>
  );
}
