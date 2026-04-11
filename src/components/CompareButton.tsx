"use client";

import { useState } from "react";
import type { SimulationResult } from "@/types";

export default function CompareButton({
  sim,
  tokenId,
  powerScore,
}: {
  sim: SimulationResult;
  tokenId: string;
  powerScore: number;
}) {
  const [copied, setCopied] = useState(false);

  function handleChallenge() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/simulate/${tokenId}?vs=true`;
    const text = `My BOOA ${sim.booa.name} scored ${powerScore}/100 on MoltBooa Lab. Can yours beat it? ${url}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleChallenge}
      className="w-full px-4 py-3 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:bg-accent-cyan/20 hover:border-accent-cyan/50 transition-all glow-cyan"
    >
      {copied
        ? "CHALLENGE LINK COPIED!"
        : "CHALLENGE A FRIEND"}
    </button>
  );
}
