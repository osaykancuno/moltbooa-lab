"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRandomTokenId } from "@/lib/khora-api";

export default function BOOAInput() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const isWallet = input.startsWith("0x") && input.length === 42;
  const isTokenId = /^\d+$/.test(input) && Number(input) < 3333;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isTokenId) {
      router.push(`/simulate/${input}`);
    } else if (isWallet) {
      router.push(`/wallet/${input}`);
    } else if (input.trim()) {
      setError("Enter a valid Token ID (0-3332) or wallet address (0x...)");
    }
  }

  function handleRandom() {
    const id = getRandomTokenId();
    router.push(`/simulate/${id}`);
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder="Token ID (e.g. 1496) or Wallet (0x...)"
            className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-sm font-[family-name:var(--font-mono)] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
          />
          {input && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-foreground/40">
              {isTokenId ? "TOKEN" : isWallet ? "WALLET" : ""}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isTokenId && !isWallet}
            className="flex-1 px-4 py-3 bg-accent-purple text-white text-sm font-[family-name:var(--font-pixel)] text-[10px] rounded-lg hover:bg-accent-purple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all glow-purple"
          >
            {isWallet ? "OPEN WALLET" : "SIMULATE"}
          </button>
          <button
            type="button"
            onClick={handleRandom}
            className="px-4 py-3 bg-card-bg border border-accent-cyan/40 text-accent-cyan text-[10px] font-[family-name:var(--font-pixel)] rounded-lg hover:bg-accent-cyan/10 transition-all"
          >
            RANDOM
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-xs text-accent-red text-center">{error}</p>
      )}
    </div>
  );
}
