"use client";

import type { ReactNode } from "react";
import { useAccount, useReadContract } from "wagmi";
import { shape } from "wagmi/chains";
import { booaAbi, booaAddress } from "@/lib/contracts/booa";

interface Props {
  tokenId: string;
  children: (ctx: { owner: `0x${string}` }) => ReactNode;
}

/**
 * Gates children behind an on-chain ownership check:
 * owner = BOOA.ownerOf(tokenId), compared case-insensitively with the
 * connected wallet. Never trusts query params alone.
 */
export default function OwnershipGate({ tokenId, children }: Props) {
  const { address, isConnected } = useAccount();
  const id = BigInt(tokenId);

  const {
    data: owner,
    isLoading,
    isError,
    error,
  } = useReadContract({
    abi: booaAbi,
    address: booaAddress,
    functionName: "ownerOf",
    args: [id],
    chainId: shape.id,
    query: { enabled: isConnected },
  });

  if (!isConnected) {
    return (
      <div className="text-center py-16 text-sm text-foreground/60">
        Connect your wallet to continue.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-16 text-sm text-foreground/60 font-[family-name:var(--font-pixel)] text-[10px]">
        VERIFYING OWNERSHIP…
      </div>
    );
  }

  if (isError || !owner) {
    return (
      <div className="text-center py-16 space-y-2">
        <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
          ERROR
        </div>
        <p className="text-xs text-foreground/60">
          Could not read BOOA #{tokenId} owner on Shape.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
      </div>
    );
  }

  const ownerLc = (owner as string).toLowerCase();
  const walletLc = (address ?? "").toLowerCase();

  if (ownerLc !== walletLc) {
    return (
      <div className="text-center py-16 space-y-3 max-w-md mx-auto">
        <div className="font-[family-name:var(--font-pixel)] text-sm text-accent-red">
          NOT YOUR BOOA
        </div>
        <p className="text-xs text-foreground/60 font-[family-name:var(--font-mono)] break-all">
          Owner on-chain: {ownerLc}
        </p>
        <p className="text-xs text-foreground/60 font-[family-name:var(--font-mono)] break-all">
          Connected: {walletLc}
        </p>
        <p className="text-xs text-foreground/50">
          Switch to the owning wallet or open a BOOA you hold.
        </p>
      </div>
    );
  }

  return <>{children({ owner: owner as `0x${string}` })}</>;
}
