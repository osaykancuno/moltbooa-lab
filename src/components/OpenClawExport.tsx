"use client";

import { useState } from "react";
import type { SimulationResult, FullBOOAData } from "@/types";
import {
  generateSOUL,
  generateIDENTITY,
  generateUSER,
  generateZipBlob,
} from "@/lib/openclaw-export";

type Tab = "SOUL" | "IDENTITY" | "USER";

export default function OpenClawExport({
  data,
  sim,
}: {
  data: FullBOOAData;
  sim: SimulationResult;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("SOUL");
  const [downloading, setDownloading] = useState(false);

  const contents: Record<Tab, string> = {
    SOUL: generateSOUL(data, sim),
    IDENTITY: generateIDENTITY(data),
    USER: generateUSER(data, sim),
  };

  async function handleDownloadZip() {
    setDownloading(true);
    try {
      const blob = await generateZipBlob(data, sim);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openclaw-${data.traits.name || "booa"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(contents[activeTab]);
  }

  const tabs: Tab[] = ["SOUL", "IDENTITY", "USER"];

  return (
    <div className="gradient-border p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
          AGENT CONFIG — OPENCLAW
        </h3>
        <button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="text-[10px] px-3 py-1.5 bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan rounded hover:bg-accent-cyan/30 disabled:opacity-40 transition-all font-[family-name:var(--font-pixel)]"
        >
          {downloading ? "PACKING..." : "DOWNLOAD ZIP"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-all ${
              activeTab === tab
                ? "bg-accent-purple/30 text-accent-purple border border-accent-purple/50"
                : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
            }`}
          >
            {tab}.md
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative">
        <pre className="bg-black/60 rounded p-3 text-[11px] leading-relaxed text-foreground/70 max-h-60 overflow-y-auto whitespace-pre-wrap">
          {contents[activeTab]}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 text-[9px] px-2 py-1 bg-card-bg border border-card-border text-foreground/40 rounded hover:text-foreground/70 transition-colors"
        >
          COPY
        </button>
      </div>
    </div>
  );
}
