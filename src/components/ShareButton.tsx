"use client";

import { useState } from "react";
import type { SimulationResult } from "@/types";

export default function ShareButton({
  sim,
  tokenId,
}: {
  sim: SimulationResult;
  tokenId: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/simulate/${tokenId}`
      : `/simulate/${tokenId}`;

  const shareText = `My BOOA "${sim.booa.name}" in 30 days on Moltbook: +${sim.totalReputation} rep, rank #${sim.rankBefore} → #${sim.rankAfter}. ${sim.alliances.length} alliance(s) formed. Try MoltBooa Lab:`;

  function handleCopyLink() {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MoltBooa Lab — ${sim.booa.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleShare}
        className="flex-1 px-4 py-3 bg-accent-purple text-white text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:bg-accent-purple/80 transition-all glow-purple"
      >
        SHARE MY FUTURE SELF
      </button>
      <button
        onClick={handleCopyLink}
        className="px-4 py-3 bg-card-bg border border-card-border text-foreground/60 text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:text-foreground transition-all"
      >
        {copied ? "COPIED!" : "COPY LINK"}
      </button>
    </div>
  );
}
