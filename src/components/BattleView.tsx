"use client";

import type { FullBOOAData, SimulationResult } from "@/types";
import { computePowerScore, getRank } from "@/lib/power-score";

interface Side {
  data: FullBOOAData;
  sim: SimulationResult;
  power: number;
}

function buildSide(data: FullBOOAData, sim: SimulationResult): Side {
  return { data, sim, power: computePowerScore(sim) };
}

function StatRow({
  label,
  left,
  right,
  leftWins,
}: {
  label: string;
  left: string | number;
  right: string | number;
  leftWins: boolean | null;
}) {
  const leftCls =
    leftWins === true
      ? "text-accent-green font-bold"
      : leftWins === false
        ? "text-foreground/40"
        : "text-foreground/70";
  const rightCls =
    leftWins === false
      ? "text-accent-green font-bold"
      : leftWins === true
        ? "text-foreground/40"
        : "text-foreground/70";

  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 border-b border-card-border last:border-b-0">
      <div className={`text-right text-xs ${leftCls}`}>{left}</div>
      <div className="text-center text-[9px] text-foreground/40 font-[family-name:var(--font-pixel)]">
        {label}
      </div>
      <div className={`text-left text-xs ${rightCls}`}>{right}</div>
    </div>
  );
}

function compareNumeric(a: number, b: number): boolean | null {
  if (a > b) return true;
  if (a < b) return false;
  return null;
}

export default function BattleView({
  data1,
  sim1,
  data2,
  sim2,
}: {
  data1: FullBOOAData;
  sim1: SimulationResult;
  data2: FullBOOAData;
  sim2: SimulationResult;
}) {
  const left = buildSide(data1, sim1);
  const right = buildSide(data2, sim2);

  const winner =
    left.power > right.power
      ? "left"
      : right.power > left.power
        ? "right"
        : "tie";

  const leftRank = getRank(left.power);
  const rightRank = getRank(right.power);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
          BATTLE MODE
        </h1>
        <p className="text-[10px] text-foreground/40">
          Two BOOA, one Power Score showdown
        </p>
      </div>

      {/* Combatants */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Left */}
        <div
          className={`gradient-border p-4 rounded-lg text-center space-y-3 ${
            winner === "left" ? "ring-2 ring-accent-green" : ""
          }`}
        >
          {data1.token.image && (
            <div
              className="mx-auto w-32 h-32 pixel-canvas rounded"
              style={{
                backgroundImage: `url("${data1.token.image}")`,
                backgroundSize: "cover",
                imageRendering: "pixelated",
              }}
            />
          )}
          <div>
            <div className="text-sm text-accent-cyan font-bold">
              {data1.traits.name}
            </div>
            <div className="text-[10px] text-foreground/40">
              BOOA #{data1.token.tokenId}
            </div>
          </div>
          <div
            className="text-5xl font-[family-name:var(--font-pixel)]"
            style={{ color: leftRank.hex }}
          >
            {left.power}
          </div>
          <div
            className="text-[10px] font-[family-name:var(--font-pixel)] inline-block px-3 py-1 rounded-full border"
            style={{
              borderColor: leftRank.hex,
              color: leftRank.hex,
            }}
          >
            RANK {leftRank.label}
          </div>
        </div>

        {/* VS */}
        <div className="text-center font-[family-name:var(--font-pixel)] text-2xl text-accent-purple py-4">
          VS
        </div>

        {/* Right */}
        <div
          className={`gradient-border p-4 rounded-lg text-center space-y-3 ${
            winner === "right" ? "ring-2 ring-accent-green" : ""
          }`}
        >
          {data2.token.image && (
            <div
              className="mx-auto w-32 h-32 pixel-canvas rounded"
              style={{
                backgroundImage: `url("${data2.token.image}")`,
                backgroundSize: "cover",
                imageRendering: "pixelated",
              }}
            />
          )}
          <div>
            <div className="text-sm text-accent-cyan font-bold">
              {data2.traits.name}
            </div>
            <div className="text-[10px] text-foreground/40">
              BOOA #{data2.token.tokenId}
            </div>
          </div>
          <div
            className="text-5xl font-[family-name:var(--font-pixel)]"
            style={{ color: rightRank.hex }}
          >
            {right.power}
          </div>
          <div
            className="text-[10px] font-[family-name:var(--font-pixel)] inline-block px-3 py-1 rounded-full border"
            style={{
              borderColor: rightRank.hex,
              color: rightRank.hex,
            }}
          >
            RANK {rightRank.label}
          </div>
        </div>
      </div>

      {/* Winner banner */}
      <div className="text-center">
        {winner === "tie" ? (
          <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-yellow">
            ⚡ DEAD HEAT — both BOOA scored {left.power}
          </div>
        ) : (
          <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-green">
            🏆 WINNER:{" "}
            {winner === "left" ? data1.traits.name : data2.traits.name} (+
            {Math.abs(left.power - right.power)})
          </div>
        )}
      </div>

      {/* Stats comparison */}
      <div className="gradient-border p-4 rounded-lg">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan mb-3 text-center">
          ROUND-BY-ROUND
        </h3>
        <div className="grid grid-cols-3 text-[9px] text-foreground/30 font-[family-name:var(--font-pixel)] pb-2 border-b border-card-border">
          <div className="text-right">{data1.traits.name}</div>
          <div className="text-center">STAT</div>
          <div className="text-left">{data2.traits.name}</div>
        </div>
        <StatRow
          label="POWER"
          left={left.power}
          right={right.power}
          leftWins={compareNumeric(left.power, right.power)}
        />
        <StatRow
          label="REPUTATION"
          left={`+${sim1.totalReputation}`}
          right={`+${sim2.totalReputation}`}
          leftWins={compareNumeric(sim1.totalReputation, sim2.totalReputation)}
        />
        <StatRow
          label="SERVICES"
          left={sim1.services.filter((s) => s.completed).length}
          right={sim2.services.filter((s) => s.completed).length}
          leftWins={compareNumeric(
            sim1.services.filter((s) => s.completed).length,
            sim2.services.filter((s) => s.completed).length
          )}
        />
        <StatRow
          label="ALLIANCES"
          left={sim1.alliances.length}
          right={sim2.alliances.length}
          leftWins={compareNumeric(sim1.alliances.length, sim2.alliances.length)}
        />
        <StatRow
          label="RANK"
          left={`#${sim1.rankAfter}`}
          right={`#${sim2.rankAfter}`}
          leftWins={compareNumeric(sim2.rankAfter, sim1.rankAfter)}
        />
        {sim1.scores && sim2.scores && (
          <StatRow
            label="OVERALL"
            left={sim1.scores.overall}
            right={sim2.scores.overall}
            leftWins={compareNumeric(
              sim1.scores.overall,
              sim2.scores.overall
            )}
          />
        )}
      </div>

      {/* Vibes */}
      <div className="grid grid-cols-2 gap-4 text-[10px]">
        <div className="bg-card-bg border border-card-border rounded p-3">
          <div className="text-accent-cyan mb-1">{data1.traits.name}</div>
          <div className="text-foreground/60">Vibe: {data1.traits.vibe}</div>
          <div className="text-foreground/60">
            Skill: {data1.traits.skill}
          </div>
          <div className="text-foreground/60">
            Domain: {data1.traits.domain}
          </div>
        </div>
        <div className="bg-card-bg border border-card-border rounded p-3">
          <div className="text-accent-cyan mb-1">{data2.traits.name}</div>
          <div className="text-foreground/60">Vibe: {data2.traits.vibe}</div>
          <div className="text-foreground/60">
            Skill: {data2.traits.skill}
          </div>
          <div className="text-foreground/60">
            Domain: {data2.traits.domain}
          </div>
        </div>
      </div>
    </div>
  );
}
