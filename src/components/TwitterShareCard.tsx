"use client";

import type { SimulationResult } from "@/types";

export default function TwitterShareCard({
  sim,
  tokenId,
  powerScore,
}: {
  sim: SimulationResult;
  tokenId: string;
  powerScore: number;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/simulate/${tokenId}`;

  const loreTruncated =
    sim.futureLore.length > 50
      ? sim.futureLore.slice(0, 50) + "..."
      : sim.futureLore;

  const tweetText = [
    `My BOOA "${sim.booa.name}" scored ${powerScore}/100 on MoltBooa Lab!`,
    "",
    `+${sim.totalReputation} reputation | ${sim.alliances.length} alliance(s) | Rank #${sim.rankAfter}`,
    `"${loreTruncated}"`,
    "",
    `Simulate yours: ${url}`,
    "",
    "#BOOA #Moltbook #ShapeNetwork #ERC8004",
  ].join("\n");

  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <a
      href={intentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full px-4 py-3 bg-black border border-foreground/20 text-center text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:bg-foreground/5 hover:border-foreground/40 transition-all"
    >
      <span className="text-foreground/90 flex items-center justify-center gap-2">
        <span className="text-base leading-none">{"\ud835\udd4F"}</span>
        <span>SHARE ON X</span>
      </span>
    </a>
  );
}
