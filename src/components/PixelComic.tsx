"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SimulationResult } from "@/types";
import { renderFrames, framesToGifBlob, type PixelFrame } from "@/lib/pixel-renderer";
import { FRAME_DELAY_MS } from "@/lib/constants";

export default function PixelComic({
  sim,
  booaImage,
}: {
  sim: SimulationResult;
  booaImage: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<PixelFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Render frames asynchronously (needs to load BOOA SVG image)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const f = await renderFrames(sim, booaImage);
        if (!cancelled) {
          setFrames(f);
          setCurrentFrame(0);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to render frames:", err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sim, booaImage]);

  // Animation loop
  useEffect(() => {
    if (frames.length === 0) return;
    const interval = setInterval(() => {
      setCurrentFrame((c) => (c + 1) % frames.length);
    }, FRAME_DELAY_MS);
    return () => clearInterval(interval);
  }, [frames]);

  // Draw current frame to visible canvas
  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const frame = frames[currentFrame];
    if (!frame) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(frame.canvas, 0, 0);
  }, [currentFrame, frames]);

  const handleDownloadGif = useCallback(async () => {
    if (frames.length === 0) return;
    setGenerating(true);
    try {
      const blob = await framesToGifBlob(frames, FRAME_DELAY_MS);
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booa-${sim.booa.name}-future.gif`;
      a.click();
    } catch (err) {
      console.error("GIF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [frames, sim.booa.name]);

  return (
    <div className="gradient-border p-4 rounded-lg">
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple mb-3">
        PIXEL COMIC — YOUR BOOA&apos;S DAY
      </h3>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {loading && (
            <div className="w-48 h-48 sm:w-64 sm:h-64 rounded border border-card-border bg-black flex items-center justify-center">
              <span className="text-[10px] text-accent-cyan font-[family-name:var(--font-pixel)] animate-pulse">
                LOADING BOOA...
              </span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={64}
            height={64}
            className={`pixel-canvas w-48 h-48 sm:w-64 sm:h-64 rounded border border-card-border bg-black ${loading ? "hidden" : ""}`}
          />
          {/* Frame indicator */}
          {!loading && frames.length > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {frames.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentFrame
                      ? "bg-accent-cyan"
                      : "bg-foreground/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Frame label */}
        {!loading && frames[currentFrame] && (
          <span className="text-[10px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            {frames[currentFrame].label}
          </span>
        )}

        {/* Download GIF */}
        <button
          onClick={handleDownloadGif}
          disabled={generating || frames.length === 0 || loading}
          className="text-[10px] px-3 py-1.5 bg-accent-purple/20 border border-accent-purple/40 text-accent-purple rounded hover:bg-accent-purple/30 disabled:opacity-40 transition-all font-[family-name:var(--font-pixel)]"
        >
          {generating ? "ENCODING..." : "DOWNLOAD GIF"}
        </button>

        {gifUrl && (
          <span className="text-[10px] text-accent-green">
            GIF ready!
          </span>
        )}
      </div>
    </div>
  );
}
