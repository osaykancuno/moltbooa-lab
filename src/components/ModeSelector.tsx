"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "battle" | "saga";

export default function ModeSelector() {
  const [mode, setMode] = useState<Mode>("battle");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const isValidId = (v: string) =>
    /^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 3332;

  function go(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "battle") {
      if (!isValidId(a) || !isValidId(b)) {
        setError("Both Token IDs must be 0-3332");
        return;
      }
      if (a === b) {
        setError("Pick two different BOOAs");
        return;
      }
      router.push(`/battle/${a}/${b}`);
    } else {
      if (!isValidId(a)) {
        setError("Token ID must be 0-3332");
        return;
      }
      router.push(`/saga/${a}`);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex gap-1 mb-3 justify-center">
        <button
          type="button"
          onClick={() => {
            setMode("battle");
            setError("");
          }}
          className={`text-[10px] px-4 py-2 rounded font-[family-name:var(--font-pixel)] transition-all ${
            mode === "battle"
              ? "bg-accent-purple/30 text-accent-purple border border-accent-purple/50"
              : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
          }`}
        >
          BATTLE MODE
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("saga");
            setError("");
          }}
          className={`text-[10px] px-4 py-2 rounded font-[family-name:var(--font-pixel)] transition-all ${
            mode === "saga"
              ? "bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/50"
              : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
          }`}
        >
          4-WEEK SAGA
        </button>
      </div>

      <p className="text-[10px] text-foreground/40 text-center mb-3">
        {mode === "battle"
          ? "Two BOOA face off. Higher Power Score wins."
          : "Watch one BOOA's arc unfold across 4 weeks."}
      </p>

      <form onSubmit={go} className="flex flex-col gap-3">
        <div className={mode === "battle" ? "grid grid-cols-2 gap-3" : ""}>
          <input
            type="text"
            value={a}
            onChange={(e) => {
              setA(e.target.value);
              setError("");
            }}
            placeholder={mode === "battle" ? "BOOA #1 (0-3332)" : "Token ID (0-3332)"}
            className="w-full px-3 py-2.5 bg-card-bg border border-card-border rounded-lg text-sm font-[family-name:var(--font-mono)] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50"
          />
          {mode === "battle" && (
            <input
              type="text"
              value={b}
              onChange={(e) => {
                setB(e.target.value);
                setError("");
              }}
              placeholder="BOOA #2 (0-3332)"
              className="w-full px-3 py-2.5 bg-card-bg border border-card-border rounded-lg text-sm font-[family-name:var(--font-mono)] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50"
            />
          )}
        </div>

        <button
          type="submit"
          className="px-4 py-2.5 bg-card-bg border border-accent-cyan/40 text-accent-cyan text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:bg-accent-cyan/10 transition-all"
        >
          {mode === "battle" ? "FIGHT" : "RUN SAGA"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-accent-red text-center">{error}</p>
      )}
    </div>
  );
}
