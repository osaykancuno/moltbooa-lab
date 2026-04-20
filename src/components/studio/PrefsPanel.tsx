"use client";

import { useEffect, useState } from "react";
import {
  hasAnyPrefs,
  loadPrefs,
  savePrefs,
  type HolderPrefs,
} from "@/lib/terminal-prefs";

interface Props {
  tokenId: string;
  /** Called when prefs change so the parent can use them on next turn. */
  onChange?: (p: HolderPrefs) => void;
}

const RISK_OPTIONS = ["conservative", "moderate", "degen"];

export default function PrefsPanel({ tokenId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<HolderPrefs>({
    risk: "",
    preferredChains: [],
    noFly: [],
    notes: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadPrefs(tokenId);
    setPrefs(p);
    onChange?.(p);
    // Open the panel automatically if it's totally empty so the holder notices.
  }, [tokenId, onChange]);

  const update = (patch: Partial<HolderPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(tokenId, next);
    onChange?.(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const configured = hasAnyPrefs(prefs);

  return (
    <div className="rounded border border-card-border bg-card-bg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-[family-name:var(--font-pixel)] text-[10px] tracking-wider text-foreground/70">
          HOLDER PREFS {configured ? "· CONFIGURED" : "· NOT SET"}
        </span>
        <span className="text-[10px] text-foreground/50">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-[11px] font-[family-name:var(--font-mono)]">
          <div>
            <label className="block text-[9px] font-[family-name:var(--font-pixel)] text-foreground/50 mb-1">
              RISK TOLERANCE
            </label>
            <div className="flex gap-1 flex-wrap">
              {RISK_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => update({ risk: prefs.risk === r ? "" : r })}
                  className={`text-[10px] px-2 py-1 rounded border font-[family-name:var(--font-pixel)] ${
                    prefs.risk === r
                      ? "bg-accent-purple/20 border-accent-purple/60 text-accent-purple"
                      : "border-card-border text-foreground/60 hover:text-foreground/90"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-[family-name:var(--font-pixel)] text-foreground/50 mb-1">
              PREFERRED CHAINS (comma separated)
            </label>
            <input
              type="text"
              value={prefs.preferredChains.join(", ")}
              onChange={(e) =>
                update({
                  preferredChains: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. Base, Arbitrum, Shape"
              className="w-full px-2 py-1 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60"
            />
          </div>
          <div>
            <label className="block text-[9px] font-[family-name:var(--font-pixel)] text-foreground/50 mb-1">
              NO-FLY LIST (comma separated)
            </label>
            <input
              type="text"
              value={prefs.noFly.join(", ")}
              onChange={(e) =>
                update({
                  noFly: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="tokens/protocols to never recommend"
              className="w-full px-2 py-1 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60"
            />
          </div>
          <div>
            <label className="block text-[9px] font-[family-name:var(--font-pixel)] text-foreground/50 mb-1">
              FREE NOTES
            </label>
            <textarea
              value={prefs.notes}
              onChange={(e) => update({ notes: e.target.value.slice(0, 600) })}
              placeholder="e.g. EU tax resident, long-term BOOA holder, focus on yield"
              rows={2}
              className="w-full px-2 py-1 bg-background border border-card-border rounded resize-none focus:outline-none focus:border-accent-purple/60"
            />
          </div>
          <p className="text-[9px] text-foreground/40 leading-snug">
            Saved in your browser only. Injected as context to your agent on every turn.
            {saved && <span className="text-accent-green ml-2">✓ saved</span>}
          </p>
        </div>
      )}
    </div>
  );
}
