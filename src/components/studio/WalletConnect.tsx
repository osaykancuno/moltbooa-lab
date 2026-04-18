"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { shape } from "wagmi/chains";
import { useMemo } from "react";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectors, connect, status: connectStatus, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  // There's only one connector (injected). Grab it.
  const injectedConnector = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors]
  );

  const wrongChain = isConnected && chainId !== shape.id;
  const pending =
    accountStatus === "reconnecting" || connectStatus === "pending";

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() =>
            injectedConnector && connect({ connector: injectedConnector })
          }
          disabled={pending || !injectedConnector}
          className="text-[10px] px-5 py-2.5 rounded border font-[family-name:var(--font-pixel)] tracking-wider transition-all bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
        {error && (
          <p className="text-[10px] text-accent-red max-w-xs text-center">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => switchChain({ chainId: shape.id })}
          disabled={switching}
          className="text-[10px] px-3 py-1.5 rounded border font-[family-name:var(--font-pixel)] bg-accent-red/20 border-accent-red/50 text-accent-red hover:bg-accent-red/30 disabled:opacity-50"
        >
          {switching ? "SWITCHING…" : "SWITCH TO SHAPE"}
        </button>
        <button
          type="button"
          onClick={() => disconnect()}
          className="text-[10px] px-2 py-1.5 text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-3 py-1.5 rounded bg-card-bg border border-card-border text-accent-green font-[family-name:var(--font-mono)]">
        {address ? shorten(address) : ""}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="text-[10px] px-3 py-1.5 text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)] border border-card-border rounded hover:border-accent-red/40 hover:text-accent-red transition-colors"
      >
        DISCONNECT
      </button>
    </div>
  );
}
