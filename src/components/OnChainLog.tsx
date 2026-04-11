"use client";

import { useEffect, useState } from "react";
import type { SimulationResult } from "@/types";

function formatLogLines(sim: SimulationResult, tokenId: string): string[] {
  const logHash = Array.from(tokenId).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) >>> 0;
  const lines: string[] = [];
  const contract = "0x7aec...b654";

  lines.push(`> SSTORE2.write(${contract}, tokenId=${tokenId})`);

  for (const event of sim.timeline) {
    const repStr =
      event.reputationDelta > 0
        ? ` [+${event.reputationDelta} rep]`
        : event.reputationDelta < 0
          ? ` [${event.reputationDelta} rep]`
          : "";
    lines.push(`> [${event.time}] ${event.description}${repStr}`);
  }

  lines.push(
    `> SSTORE2.commit(log_hash=0x${logHash.toString(16).padStart(8, "0")}...)`
  );

  return lines;
}

export default function OnChainLog({
  sim,
  tokenId,
}: {
  sim: SimulationResult;
  tokenId: string;
}) {
  const allLines = formatLogLines(sim, tokenId);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < allLines.length) {
      const timer = setTimeout(
        () => setVisibleCount((c) => c + 1),
        300
      );
      return () => clearTimeout(timer);
    }
  }, [visibleCount, allLines.length]);

  return (
    <div className="gradient-border p-4 rounded-lg">
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-green mb-3">
        ON-CHAIN LOG
      </h3>
      <div className="bg-black/60 rounded p-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed max-h-72 overflow-y-auto space-y-1">
        {allLines.slice(0, visibleCount).map((line, i) => (
          <div
            key={i}
            className="typewriter-line"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span
              className={
                line.includes("CONFLICT")
                  ? "text-accent-red"
                  : line.includes("ALLIANCE")
                    ? "text-accent-green"
                    : line.includes("SERVICE")
                      ? "text-accent-yellow"
                      : line.includes("SSTORE2")
                        ? "text-accent-purple"
                        : "text-foreground/70"
              }
            >
              {line}
            </span>
          </div>
        ))}
        {visibleCount < allLines.length && (
          <span className="cursor-blink text-accent-green">_</span>
        )}
      </div>
    </div>
  );
}
