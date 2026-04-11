import { C64_PALETTE, CANVAS_SIZE } from "./constants";
import type { SimulationResult } from "@/types";

// Deterministic PRNG for rendering
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Color = string;

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: Color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: Color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawStars(ctx: CanvasRenderingContext2D, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * CANVAS_SIZE);
    const y = Math.floor(rng() * CANVAS_SIZE);
    const brightness = rng() > 0.5 ? "#FFFFFF" : "#777777";
    drawPixel(ctx, x, y, brightness);
  }
}

// Text rendering (3x5 pixel font)
const MINI_FONT: Record<string, number[]> = {
  "+": [0, 2, 7, 2, 0],
  "-": [0, 0, 7, 0, 0],
  "#": [5, 7, 5, 7, 5],
  "0": [7, 5, 5, 5, 7],
  "1": [2, 6, 2, 2, 7],
  "2": [7, 1, 7, 4, 7],
  "3": [7, 1, 7, 1, 7],
  "4": [5, 5, 7, 1, 1],
  "5": [7, 4, 7, 1, 7],
  "6": [7, 4, 7, 5, 7],
  "7": [7, 1, 2, 2, 2],
  "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 7],
};

function drawMiniText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  let cx = x;
  for (const ch of text) {
    const glyph = MINI_FONT[ch];
    if (glyph) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (glyph[row] & (4 >> col)) {
            drawPixel(ctx, cx + col, y + row, color);
          }
        }
      }
      cx += 4;
    } else {
      cx += 3;
    }
  }
}

// Load the BOOA SVG image onto an offscreen canvas
async function loadBOOAImage(svgData: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;
      // Draw the BOOA SVG scaled to 64x64
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error("Failed to load BOOA image"));

    // Handle different image formats
    if (svgData.startsWith("<svg")) {
      // Raw SVG string — convert to data URI
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } else if (svgData.startsWith("data:")) {
      // Already a data URI
      img.src = svgData;
    } else {
      // URL (CDN)
      img.src = svgData;
    }
  });
}

// Draw the BOOA at a specific position and size on the target canvas
function drawBOOA(
  ctx: CanvasRenderingContext2D,
  booaCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  size: number
) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(booaCanvas, x, y, size, size);
}

// Draw a glowing outline around the BOOA
function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  rng: () => number
) {
  for (let i = 0; i < 24; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = size * 0.5 + rng() * 6;
    const px = Math.floor(x + size / 2 + Math.cos(angle) * dist);
    const py = Math.floor(y + size / 2 + Math.sin(angle) * dist);
    if (px >= 0 && px < CANVAS_SIZE && py >= 0 && py < CANVAS_SIZE) {
      drawPixel(ctx, px, py, color);
    }
  }
}

// Draw a simple HUD bar
function drawHudBar(ctx: CanvasRenderingContext2D, y: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  fillRect(ctx, 0, y, 64, 8, color);
  ctx.globalAlpha = 1;
}

// Draw scan lines effect
function drawScanlines(ctx: CanvasRenderingContext2D, intensity: number) {
  ctx.globalAlpha = intensity;
  for (let y = 0; y < CANVAS_SIZE; y += 2) {
    fillRect(ctx, 0, y, CANVAS_SIZE, 1, "#000000");
  }
  ctx.globalAlpha = 1;
}

// Draw event icon
function drawEventIcon(ctx: CanvasRenderingContext2D, type: string, x: number, y: number) {
  switch (type) {
    case "service":
      fillRect(ctx, x + 1, y, 3, 1, C64_PALETTE[7]);
      fillRect(ctx, x, y + 1, 5, 3, C64_PALETTE[7]);
      fillRect(ctx, x + 1, y + 4, 3, 1, C64_PALETTE[7]);
      drawPixel(ctx, x + 2, y + 2, "#000000");
      break;
    case "alliance":
      fillRect(ctx, x, y + 1, 2, 3, C64_PALETTE[5]);
      fillRect(ctx, x + 3, y + 1, 2, 3, C64_PALETTE[14]);
      fillRect(ctx, x + 2, y, 1, 5, C64_PALETTE[1]);
      break;
    case "conflict":
      fillRect(ctx, x + 2, y, 2, 2, C64_PALETTE[10]);
      fillRect(ctx, x + 1, y + 2, 2, 1, C64_PALETTE[10]);
      fillRect(ctx, x + 2, y + 3, 2, 2, C64_PALETTE[10]);
      break;
    case "reputation":
      drawPixel(ctx, x + 2, y, C64_PALETTE[7]);
      fillRect(ctx, x + 1, y + 1, 3, 1, C64_PALETTE[7]);
      fillRect(ctx, x, y + 2, 5, 1, C64_PALETTE[7]);
      fillRect(ctx, x + 1, y + 3, 3, 1, C64_PALETTE[7]);
      drawPixel(ctx, x, y + 4, C64_PALETTE[7]);
      drawPixel(ctx, x + 4, y + 4, C64_PALETTE[7]);
      break;
    default:
      fillRect(ctx, x + 1, y + 1, 3, 3, C64_PALETTE[3]);
  }
}

export interface PixelFrame {
  canvas: HTMLCanvasElement;
  label: string;
}

// Render frames using the actual BOOA on-chain image
export async function renderFrames(
  sim: SimulationResult,
  booaImageSrc: string
): Promise<PixelFrame[]> {
  const frames: PixelFrame[] = [];

  // Load the real BOOA image
  let booaCanvas: HTMLCanvasElement;
  try {
    booaCanvas = await loadBOOAImage(booaImageSrc);
  } catch {
    // Fallback: create a simple placeholder
    booaCanvas = document.createElement("canvas");
    booaCanvas.width = CANVAS_SIZE;
    booaCanvas.height = CANVAS_SIZE;
    const fctx = booaCanvas.getContext("2d")!;
    fillRect(fctx, 0, 0, 64, 64, "#000000");
    fillRect(fctx, 16, 16, 32, 32, C64_PALETTE[4]);
  }

  // ─── Frame 1: BOOT — BOOA appears with loading effect ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    // Dark background with stars
    fillRect(ctx, 0, 0, 64, 64, "#0a0a0f");
    const rng = mulberry32(sim.weekSeed + 1);
    drawStars(ctx, rng, 15);

    // Draw BOOA centered, slightly smaller with a "materializing" effect
    drawBOOA(ctx, booaCanvas, 8, 8, 48);

    // CRT scan lines
    drawScanlines(ctx, 0.15);

    // Top HUD: "BOOT"
    drawHudBar(ctx, 0, "#000000", 0.7);
    drawMiniText(ctx, "+0", 52, 2, C64_PALETTE[5]);

    // Bottom status bar
    drawHudBar(ctx, 56, "#000000", 0.7);
    // Loading dots
    for (let i = 0; i < 5; i++) {
      drawPixel(ctx, 24 + i * 4, 60, i < 3 ? C64_PALETTE[3] : C64_PALETTE[11]);
    }

    frames.push({ canvas, label: "Booting on Moltbook..." });
  }

  // ─── Frame 2: SERVICE — BOOA offering a service ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    fillRect(ctx, 0, 0, 64, 64, "#0a0a0f");
    const rng = mulberry32(sim.weekSeed + 2);
    drawStars(ctx, rng, 10);

    // BOOA on the left side
    drawBOOA(ctx, booaCanvas, 2, 10, 36);

    // Service icon on the right
    drawEventIcon(ctx, "service", 46, 20);

    // Connection line (data stream from BOOA to service)
    for (let i = 0; i < 8; i++) {
      const px = 38 + i;
      const py = 28 + Math.floor(Math.sin(i * 0.8) * 2);
      drawPixel(ctx, px, py, i % 2 === 0 ? C64_PALETTE[7] : C64_PALETTE[8]);
    }

    // Reputation gain
    const svcRep = sim.timeline[1]?.reputationDelta ?? 0;
    drawMiniText(ctx, `+${svcRep}`, 50, 4, C64_PALETTE[7]);

    // HUD
    drawHudBar(ctx, 56, "#000000", 0.7);
    drawMiniText(ctx, "5VC", 4, 58, C64_PALETTE[7]);

    frames.push({ canvas, label: "Offering OASF Service" });
  }

  // ─── Frame 3: ALLIANCE — Two BOOAs connecting ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    fillRect(ctx, 0, 0, 64, 64, "#0a0a0f");
    const rng = mulberry32(sim.weekSeed + 3);
    drawStars(ctx, rng, 12);

    // Main BOOA on the left
    drawBOOA(ctx, booaCanvas, 2, 12, 28);

    // Alliance icon in center
    drawEventIcon(ctx, "alliance", 30, 22);

    // Ally represented by a green-tinted silhouette
    ctx.globalAlpha = 0.7;
    ctx.filter = "hue-rotate(120deg) brightness(0.8)";
    drawBOOA(ctx, booaCanvas, 36, 14, 24);
    ctx.filter = "none";
    ctx.globalAlpha = 1;

    // Connection beam
    for (let x = 28; x < 38; x++) {
      drawPixel(ctx, x, 26, C64_PALETTE[5]);
      if (x % 2 === 0) drawPixel(ctx, x, 25, C64_PALETTE[13]);
    }

    // Rep gain
    const allyRep = sim.timeline[2]?.reputationDelta ?? 0;
    drawMiniText(ctx, `+${allyRep}`, 50, 4, C64_PALETTE[5]);

    drawHudBar(ctx, 56, "#000000", 0.7);

    frames.push({ canvas, label: "Alliance Formed" });
  }

  // ─── Frame 4: CONFLICT or REPUTATION ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    const hasConflict = sim.timeline.some((e) => e.type === "conflict");
    const rng = mulberry32(sim.weekSeed + 4);

    if (hasConflict) {
      // Red-tinted background
      fillRect(ctx, 0, 0, 64, 64, "#1a0505");
      drawStars(ctx, rng, 6);

      // BOOA with red tint
      ctx.filter = "saturate(0.5) brightness(0.9)";
      drawBOOA(ctx, booaCanvas, 8, 8, 48);
      ctx.filter = "none";

      // Lightning bolts
      drawEventIcon(ctx, "conflict", 4, 4);
      drawEventIcon(ctx, "conflict", 54, 8);
      drawEventIcon(ctx, "conflict", 6, 50);

      // Red scan lines
      for (let y = 0; y < 64; y += 4) {
        ctx.globalAlpha = 0.3;
        fillRect(ctx, 0, y, 64, 1, C64_PALETTE[2]);
        ctx.globalAlpha = 1;
      }
    } else {
      // Reputation gain — golden glow
      fillRect(ctx, 0, 0, 64, 64, "#0a0a0f");
      drawStars(ctx, rng, 18);

      drawBOOA(ctx, booaCanvas, 8, 8, 48);

      // Golden glow around BOOA
      drawGlow(ctx, 8, 8, 48, C64_PALETTE[7], rng);

      // Reputation icons
      drawEventIcon(ctx, "reputation", 4, 4);
      drawEventIcon(ctx, "reputation", 52, 4);
      drawMiniText(ctx, `+${sim.totalReputation}`, 24, 58, C64_PALETTE[7]);
    }

    frames.push({ canvas, label: hasConflict ? "Conflict Resolved" : "Reputation Rising" });
  }

  // ─── Frame 5: SERVICE COMPLETE — checkmark overlay ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    fillRect(ctx, 0, 0, 64, 64, "#050520");
    const rng = mulberry32(sim.weekSeed + 5);
    drawStars(ctx, rng, 20);

    // BOOA centered
    drawBOOA(ctx, booaCanvas, 8, 6, 48);

    // Green checkmark overlay
    const cx = 44, cy = 44;
    drawPixel(ctx, cx, cy + 4, C64_PALETTE[5]);
    drawPixel(ctx, cx + 1, cy + 5, C64_PALETTE[5]);
    drawPixel(ctx, cx + 2, cy + 6, C64_PALETTE[5]);
    drawPixel(ctx, cx + 3, cy + 5, C64_PALETTE[5]);
    drawPixel(ctx, cx + 4, cy + 4, C64_PALETTE[5]);
    drawPixel(ctx, cx + 5, cy + 3, C64_PALETTE[5]);
    drawPixel(ctx, cx + 6, cy + 2, C64_PALETTE[5]);
    // Larger checkmark
    drawPixel(ctx, cx + 1, cy + 4, C64_PALETTE[13]);
    drawPixel(ctx, cx + 2, cy + 5, C64_PALETTE[13]);
    drawPixel(ctx, cx + 3, cy + 4, C64_PALETTE[13]);
    drawPixel(ctx, cx + 4, cy + 3, C64_PALETTE[13]);
    drawPixel(ctx, cx + 5, cy + 2, C64_PALETTE[13]);

    // Rep total
    drawMiniText(ctx, `+${sim.totalReputation}`, 50, 2, C64_PALETTE[5]);

    drawHudBar(ctx, 56, "#000000", 0.6);
    drawMiniText(ctx, "0K", 28, 58, C64_PALETTE[5]);

    frames.push({ canvas, label: "Service Complete" });
  }

  // ─── Frame 6: FUTURE SELF — BOOA with epic aura ───
  {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    fillRect(ctx, 0, 0, 64, 64, "#0a0020");
    const rng = mulberry32(sim.weekSeed + 6);
    drawStars(ctx, rng, 30);

    // Determine aura color by reputation
    const auraColor =
      sim.totalReputation > 50
        ? C64_PALETTE[7]  // Yellow — legendary
        : sim.totalReputation > 30
          ? C64_PALETTE[3]  // Cyan — strong
          : C64_PALETTE[4]; // Purple — rising

    // Draw aura FIRST (behind the BOOA)
    drawGlow(ctx, 4, 4, 56, auraColor, rng);
    drawGlow(ctx, 4, 4, 56, auraColor, rng);

    // Draw the BOOA large and centered
    drawBOOA(ctx, booaCanvas, 4, 4, 56);

    // Rank display at bottom
    drawHudBar(ctx, 56, "#000000", 0.7);
    drawMiniText(ctx, `#${sim.rankAfter}`, 4, 58, C64_PALETTE[1]);

    // Power indicator
    const repStr = `+${sim.totalReputation}`;
    drawMiniText(ctx, repStr, 48, 58, auraColor);

    frames.push({ canvas, label: "Future Self — 30 Days" });
  }

  return frames;
}

export function framesToGifBlob(
  frames: PixelFrame[],
  delay: number = 600
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    import("gif.js").then(({ default: GIF }) => {
      const gif = new GIF({
        workers: 2,
        quality: 1,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        workerScript: "/gif.worker.js",
      });

      for (const frame of frames) {
        gif.addFrame(frame.canvas, { delay, copy: true });
      }

      gif.on("finished", (blob: Blob) => resolve(blob));
      gif.on("error", (err: Error) => reject(err));
      gif.render();
    }).catch(reject);
  });
}
