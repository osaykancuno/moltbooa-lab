"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchWalletBOOAs } from "@/lib/khora-api";
import type { WalletNFT } from "@/types";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletPage() {
  const params = useParams();
  const address = params.address as string;

  const [nfts, setNfts] = useState<WalletNFT[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchWalletBOOAs(address);
        if (cancelled) return;
        // Sort numerically by tokenId
        const sorted = [...data].sort(
          (a, b) => Number(a.tokenId) - Number(b.tokenId)
        );
        setNfts(sorted);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load wallet"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      load();
    } else {
      setError("Invalid wallet address");
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="text-center space-y-2 mb-8">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            WALLET
          </h1>
          <p className="text-xs text-foreground/50 font-[family-name:var(--font-mono)]">
            {shortAddress(address)}
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-cyan glitch-text">
              SCANNING WALLET
            </div>
            <p className="text-[10px] text-foreground/40 font-[family-name:var(--font-mono)]">
              Querying Shape Network for BOOA holdings...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
              ERROR
            </div>
            <p className="text-sm text-foreground/60 text-center max-w-md">
              {error}
            </p>
            <a
              href="/"
              className="text-[10px] px-4 py-2 bg-accent-purple/20 border border-accent-purple/40 text-accent-purple rounded hover:bg-accent-purple/30 transition-all font-[family-name:var(--font-pixel)]"
            >
              BACK
            </a>
          </div>
        )}

        {!loading && !error && nfts.length === 0 && (
          <div className="text-center py-32">
            <p className="text-sm text-foreground/60">
              No BOOA found in this wallet.
            </p>
          </div>
        )}

        {!loading && !error && nfts.length > 0 && (
          <>
            <div className="text-center mb-6">
              <span className="text-[10px] text-foreground/50 font-[family-name:var(--font-pixel)]">
                {nfts.length} BOOA{nfts.length === 1 ? "" : "S"} OWNED
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {nfts.map((nft) => (
                <a
                  key={nft.tokenId}
                  href={`/simulate/${nft.tokenId}`}
                  className="gradient-border rounded p-3 text-center hover:scale-105 transition-transform group"
                >
                  {nft.image && (
                    <div
                      className="w-full aspect-square pixel-canvas rounded mb-2"
                      style={{
                        backgroundImage: `url("${nft.image}")`,
                        backgroundSize: "cover",
                        imageRendering: "pixelated",
                      }}
                    />
                  )}
                  <div className="text-[10px] text-accent-cyan font-[family-name:var(--font-pixel)] truncate">
                    {nft.name || `BOOA #${nft.tokenId}`}
                  </div>
                  <div className="text-[9px] text-foreground/40 mt-1">
                    #{nft.tokenId}
                  </div>
                  <div className="text-[9px] text-accent-purple opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    SIMULATE →
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
