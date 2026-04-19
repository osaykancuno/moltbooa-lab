"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import WalletConnect from "@/components/studio/WalletConnect";
import Steps from "@/components/studio/Steps";
import { fetchWalletBOOAs } from "@/lib/khora-api";
import type { WalletNFT } from "@/types";

export default function StudioHome() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<WalletNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConnected || !address) {
      setNfts([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchWalletBOOAs(address!);
        if (cancelled) return;
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
    load();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            MOLTBOOA STUDIO
          </h1>
          <p className="text-xs sm:text-sm text-foreground/60 max-w-xl mx-auto leading-relaxed">
            Activate your BOOA for real. Your wallet signs everything — we
            never hold keys, you never hand over secrets.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <WalletConnect />
        </div>

        {/* How it works — always visible. Users know what they're in for */}
        {/* before connecting. */}
        <section className="mb-10 rounded-lg border border-card-border bg-card-bg/50 p-5">
          <Steps
            heading="── HOW IT WORKS ──"
            steps={[
              {
                title: "CONNECT YOUR WALLET",
                status: isConnected ? "done" : "current",
                body: (
                  <>
                    Click <strong>CONNECT WALLET</strong> above. MetaMask
                    (or any other injected wallet) opens a popup — approve it.
                    We only request your public address, never a signature
                    at this stage.
                  </>
                ),
              },
              {
                title: "PICK A BOOA YOU OWN",
                status: isConnected ? "current" : "todo",
                body: (
                  <>
                    Your wallet&apos;s BOOA collection appears below. Click
                    one — the Studio verifies ownership on-chain before
                    letting you change anything.
                  </>
                ),
              },
              {
                title: "REGISTER VIA KHÔRA BRIDGE",
                body: (
                  <>
                    Identity registration on ERC-8004 is handled by the
                    community tool{" "}
                    <a
                      href="https://khora.fun/bridge"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-cyan hover:underline"
                    >
                      khora.fun/bridge ↗
                    </a>
                    . One Shape transaction from your wallet — come back
                    here when it confirms.
                  </>
                ),
              },
              {
                title: "DEPLOY YOUR ENDPOINT",
                body: (
                  <>
                    Download a one-click agent template (already wired to
                    read your BOOA&apos;s live on-chain state via Khôra
                    APIs). Push it to Vercel / Netlify / Cloudflare — free
                    tier works. Paste the URL back here and your agent is
                    live at <code className="text-accent-cyan">/agent/[id]</code>.
                  </>
                ),
              },
            ]}
          />
        </section>

        {!isConnected && (
          <div className="text-center text-[11px] text-foreground/40 max-w-md mx-auto space-y-2">
            <p>
              Supports any injected wallet (MetaMask, Rabby, Coinbase
              Wallet, Leather in EVM mode, …).
            </p>
            <p>
              Just curious? Try a{" "}
              <Link href="/" className="text-accent-cyan hover:underline">
                Lab simulation
              </Link>{" "}
              first — no wallet required.
            </p>
          </div>
        )}

        {isConnected && loading && (
          <div className="text-center py-16 text-sm text-foreground/60 font-[family-name:var(--font-pixel)] text-[10px]">
            SCANNING WALLET…
          </div>
        )}

        {isConnected && error && (
          <div className="text-center py-16 space-y-2">
            <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
              ERROR
            </div>
            <p className="text-sm text-foreground/60 max-w-md mx-auto">
              {error}
            </p>
          </div>
        )}

        {isConnected && !loading && !error && nfts.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-foreground/60">
              No BOOA found in this wallet.
            </p>
            <p className="text-[11px] text-foreground/40 max-w-sm mx-auto">
              Either this wallet doesn&apos;t own a BOOA, or the indexer
              hasn&apos;t caught up yet. You can still simulate any BOOA
              in the Lab without owning one.
            </p>
            <Link
              href="/"
              className="inline-block text-[10px] px-4 py-2 bg-accent-purple/20 border border-accent-purple/40 text-accent-purple rounded hover:bg-accent-purple/30 transition-all font-[family-name:var(--font-pixel)]"
            >
              SIMULATE ANY BOOA →
            </Link>
          </div>
        )}

        {isConnected && nfts.length > 0 && (
          <>
            <div className="text-center mb-6">
              <span className="text-[10px] text-foreground/50 font-[family-name:var(--font-pixel)]">
                STEP 2 · {nfts.length} BOOA{nfts.length === 1 ? "" : "S"} —
                SELECT ONE TO ACTIVATE
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {nfts.map((nft) => (
                <Link
                  key={nft.tokenId}
                  href={`/studio/${nft.tokenId}`}
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
                    ACTIVATE →
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
