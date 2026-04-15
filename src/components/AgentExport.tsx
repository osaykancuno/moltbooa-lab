"use client";

import { useState } from "react";
import type { SimulationResult, FullBOOAData } from "@/types";
import {
  generateSOUL,
  generateIDENTITY,
  generateUSER,
  generateZipBlob as generateOpenClawZip,
} from "@/lib/openclaw-export";
import { generateElizaJson } from "@/lib/eliza-export";
import {
  generateMCPServerCode,
  generateMCPClientConfig,
  generateMCPReadme,
} from "@/lib/mcp-export";

type Framework = "openclaw" | "eliza" | "mcp";

const FRAMEWORK_LABELS: Record<Framework, string> = {
  openclaw: "OPENCLAW",
  eliza: "ELIZAOS",
  mcp: "MCP SERVER",
};

const FRAMEWORK_DESCRIPTIONS: Record<Framework, string> = {
  openclaw:
    "Owner-facing config (SOUL / IDENTITY / USER) for the OpenClaw agent framework.",
  eliza:
    "ElizaOS character.json — drop into elizaos/eliza, set OPENROUTER_API_KEY, run.",
  mcp:
    "Model Context Protocol server — plug your BOOA into Claude Desktop, Cursor, Cline.",
};

export default function AgentExport({
  data,
  sim,
}: {
  data: FullBOOAData;
  sim: SimulationResult;
}) {
  const [framework, setFramework] = useState<Framework>("openclaw");
  const [activeFile, setActiveFile] = useState<string>("SOUL.md");
  const [downloading, setDownloading] = useState(false);

  const safeName = (data.traits.name || "booa")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();

  // Build file map for the current framework
  const files: Record<string, string> = (() => {
    if (framework === "openclaw") {
      const map: Record<string, string> = {
        "SOUL.md": generateSOUL(data, sim),
        "IDENTITY.md": generateIDENTITY(data),
        "USER.md": generateUSER(data, sim),
      };
      return map;
    }
    if (framework === "eliza") {
      const map: Record<string, string> = {};
      map[`${safeName}.character.json`] = generateElizaJson(data, sim);
      return map;
    }
    const map: Record<string, string> = {};
    map[`${safeName}_mcp_server.js`] = generateMCPServerCode(data, sim);
    map["mcp_config.json"] = generateMCPClientConfig(data);
    map["README.md"] = generateMCPReadme(data, sim);
    return map;
  })();

  const fileNames = Object.keys(files);
  const currentFile = files[activeFile] ?? files[fileNames[0]];

  function switchFramework(fw: Framework) {
    setFramework(fw);
    // Reset active file to first of the new framework
    const next: Record<Framework, string> = {
      openclaw: "SOUL.md",
      eliza: `${safeName}.character.json`,
      mcp: `${safeName}_mcp_server.js`,
    };
    setActiveFile(next[fw]);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      let blob: Blob;
      let filename: string;

      if (framework === "openclaw") {
        blob = await generateOpenClawZip(data, sim);
        filename = `openclaw-${safeName}.zip`;
      } else {
        // Pack ad-hoc files into a ZIP
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        Object.entries(files).forEach(([name, content]) => {
          zip.file(name, content);
        });
        blob = await zip.generateAsync({ type: "blob" });
        filename = `${framework}-${safeName}.zip`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(currentFile);
  }

  return (
    <div className="gradient-border p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
          AGENT CONFIG EXPORT
        </h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="text-[10px] px-3 py-1.5 bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan rounded hover:bg-accent-cyan/30 disabled:opacity-40 transition-all font-[family-name:var(--font-pixel)]"
        >
          {downloading ? "PACKING..." : "DOWNLOAD ZIP"}
        </button>
      </div>

      {/* Framework selector */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {(Object.keys(FRAMEWORK_LABELS) as Framework[]).map((fw) => (
          <button
            key={fw}
            onClick={() => switchFramework(fw)}
            className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-all ${
              framework === fw
                ? "bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/50"
                : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
            }`}
          >
            {FRAMEWORK_LABELS[fw]}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-foreground/40 mb-3 leading-relaxed">
        {FRAMEWORK_DESCRIPTIONS[framework]}
      </p>

      {/* File tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {fileNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveFile(name)}
            className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-all ${
              activeFile === name
                ? "bg-accent-purple/30 text-accent-purple border border-accent-purple/50"
                : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative">
        <pre className="bg-black/60 rounded p-3 text-[11px] leading-relaxed text-foreground/70 max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
          {currentFile}
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
