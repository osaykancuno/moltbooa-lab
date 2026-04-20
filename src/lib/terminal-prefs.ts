/**
 * Per-tokenId holder preferences for the Agent Terminal.
 *
 * Stored in localStorage — never leaves the browser. Injected into every
 * chat turn as a "[system] holder preferences" preamble so the agent can
 * tailor recommendations without re-asking.
 *
 * Preferences are advisory only. They do NOT bypass any guard in the
 * approval flow — the holder still signs every on-chain action.
 */

export interface HolderPrefs {
  /** "conservative" | "moderate" | "degen". Free-form but UI offers these. */
  risk: string;
  /** Chain names the holder prefers (e.g. ["Base", "Arbitrum"]). */
  preferredChains: string[];
  /** Token symbols, protocol slugs, or assets the holder never wants suggested. */
  noFly: string[];
  /** Free-form notes — "I'm a long-term holder", "EU tax resident", etc. */
  notes: string;
}

const EMPTY: HolderPrefs = {
  risk: "",
  preferredChains: [],
  noFly: [],
  notes: "",
};

function key(tokenId: string): string {
  return `moltbook.terminal.prefs.${tokenId}`;
}

export function loadPrefs(tokenId: string): HolderPrefs {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(key(tokenId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<HolderPrefs>;
    return {
      risk: typeof parsed.risk === "string" ? parsed.risk : "",
      preferredChains: Array.isArray(parsed.preferredChains)
        ? parsed.preferredChains.filter((c): c is string => typeof c === "string")
        : [],
      noFly: Array.isArray(parsed.noFly)
        ? parsed.noFly.filter((c): c is string => typeof c === "string")
        : [],
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function savePrefs(tokenId: string, prefs: HolderPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(tokenId), JSON.stringify(prefs));
  } catch {
    // quota/security error — silently ignore
  }
}

export function hasAnyPrefs(p: HolderPrefs): boolean {
  return (
    !!p.risk.trim() ||
    p.preferredChains.length > 0 ||
    p.noFly.length > 0 ||
    !!p.notes.trim()
  );
}

/** Build the preamble string injected before the user's message. */
export function formatPrefsPreamble(p: HolderPrefs): string | null {
  if (!hasAnyPrefs(p)) return null;
  const parts: string[] = [];
  if (p.risk.trim()) parts.push(`risk tolerance: ${p.risk.trim()}`);
  if (p.preferredChains.length > 0)
    parts.push(`preferred chains: ${p.preferredChains.join(", ")}`);
  if (p.noFly.length > 0) parts.push(`no-fly list: ${p.noFly.join(", ")}`);
  if (p.notes.trim()) parts.push(`notes: ${p.notes.trim().slice(0, 600)}`);
  return `[system] holder preferences — respect these when recommending:\n${parts.map((l) => `- ${l}`).join("\n")}`;
}
