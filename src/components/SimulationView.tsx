"use client";

import type { SimulationResult, FullBOOAData } from "@/types";
import PixelComic from "./PixelComic";
import OnChainLog from "./OnChainLog";
import ReputationBar from "./ReputationBar";
import AllianceCard from "./AllianceCard";
import ServiceCard from "./ServiceCard";
import FutureSelfCard from "./FutureSelfCard";
import OpenClawExport from "./OpenClawExport";
import ShareButton from "./ShareButton";
import PowerScore, { computePowerScore } from "./PowerScore";
import CompareButton from "./CompareButton";
import WeeklyBadge from "./WeeklyBadge";
import TwitterShareCard from "./TwitterShareCard";

export default function SimulationView({
  sim,
  data,
  tokenId,
}: {
  sim: SimulationResult;
  data: FullBOOAData;
  tokenId: string;
}) {
  const powerScore = computePowerScore(sim);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero: BOOA name + basic info */}
      <div className="text-center space-y-2">
        <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
          {sim.booa.name}
        </h1>
        <p className="text-xs text-foreground/50">
          BOOA #{tokenId} — {sim.booa.creature}
        </p>
        <p className="text-[10px] text-foreground/30">
          Vibe: {sim.booa.vibe} | Skill: {sim.booa.skill} | Domain:{" "}
          {sim.booa.domain}
        </p>
        {sim.scores && (
          <div className="flex justify-center gap-3 text-[10px]">
            <span className="text-accent-purple">
              Identity {sim.scores.identity}
            </span>
            <span className="text-accent-cyan">
              Capability {sim.scores.capability}
            </span>
            <span className="text-accent-green">
              Trust {sim.scores.trust}
            </span>
            <span className="text-accent-yellow">
              Overall {sim.scores.overall}
            </span>
          </div>
        )}
      </div>

      {/* Power Score — right after hero, before main grid */}
      <PowerScore sim={sim} />

      {/* Main grid: Comic + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PixelComic sim={sim} booaImage={data.token.image} />
        <OnChainLog sim={sim} tokenId={tokenId} />
      </div>

      {/* Reputation */}
      <ReputationBar sim={sim} />

      {/* Services + Alliances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-yellow">
            SERVICES OFFERED
          </h3>
          {sim.services.map((s, i) => (
            <ServiceCard key={i} service={s} />
          ))}
        </div>
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-green">
            ALLIANCES FORMED
          </h3>
          {sim.alliances.map((a, i) => (
            <AllianceCard key={i} ally={a} />
          ))}
        </div>
      </div>

      {/* Future Lore */}
      <FutureSelfCard sim={sim} />

      {/* Weekly Badge */}
      <WeeklyBadge sim={sim} />

      {/* OpenClaw Export */}
      <OpenClawExport data={data} sim={sim} />

      {/* Share */}
      <ShareButton sim={sim} tokenId={tokenId} />

      {/* Challenge a Friend */}
      <CompareButton sim={sim} tokenId={tokenId} powerScore={powerScore} />

      {/* Share on X */}
      <TwitterShareCard sim={sim} tokenId={tokenId} powerScore={powerScore} />
    </div>
  );
}
