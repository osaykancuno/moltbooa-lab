"use client";

/**
 * `useExecuteAction` — single entry point the terminal uses to sign a
 * proposed action. Picks the right wagmi hook per `kind`:
 *
 *   contract   → writeContract (viem-typed)
 *   tx         → sendTransaction (raw calldata)
 *   sign_msg   → signMessage
 *   typed_data → signTypedData (EIP-712)
 *
 * Multi-chain: for tx / contract actions we first `switchChain` to the
 * action's target chain. Most injected wallets honor EIP-3326 and do this
 * silently; some ask for confirmation. If the wallet rejects the switch we
 * surface it as a regular "rejected" error — the user sees "REJECTED" on
 * the card and the LLM gets told.
 *
 * For `sign_msg` / `typed_data` we don't switch — off-chain signatures are
 * chain-agnostic (typed_data encodes `chainId` in its domain).
 */

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import {
  getPublicClient,
  sendTransaction,
  signMessage,
  signTypedData,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi-config";
import type { AgentAction, ActionResult } from "./types";

export function useExecuteAction() {
  const { address, chainId: walletChainId } = useAccount();
  const [running, setRunning] = useState<string | null>(null);

  const execute = useCallback(
    async (action: AgentAction): Promise<ActionResult> => {
      const startedAt = Date.now();
      setRunning(action.id);

      try {
        if (action.kind === "sign_msg") {
          const signature = await signMessage(wagmiConfig, {
            message: action.message,
            account: address,
          });
          return {
            id: action.id,
            status: "success",
            signature,
            startedAt,
            endedAt: Date.now(),
          };
        }

        if (action.kind === "typed_data") {
          const signature = await signTypedData(wagmiConfig, {
            domain: action.domain,
            types: action.types,
            primaryType: action.primaryType,
            message: action.message,
            account: address,
          });
          return {
            id: action.id,
            status: "success",
            signature,
            startedAt,
            endedAt: Date.now(),
          };
        }

        // On-chain action: ensure the wallet is on the right chain first.
        if (walletChainId !== action.chainId) {
          await switchChain(wagmiConfig, { chainId: action.chainId });
        }

        let hash: `0x${string}`;
        if (action.kind === "contract") {
          hash = await writeContract(wagmiConfig, {
            address: action.address,
            abi: action.abi,
            functionName: action.functionName,
            args: action.args,
            value: action.value ? BigInt(action.value) : undefined,
            chainId: action.chainId,
            account: address,
          });
        } else {
          // raw tx
          hash = await sendTransaction(wagmiConfig, {
            to: action.to,
            data: action.data,
            value: action.value ? BigInt(action.value) : undefined,
            chainId: action.chainId,
            account: address,
          });
        }

        // Wait for the receipt on the action's chain so block numbers
        // match what the explorer shows.
        const client = getPublicClient(wagmiConfig, {
          chainId: action.chainId,
        });
        const receipt = client
          ? await client.waitForTransactionReceipt({ hash })
          : await waitForTransactionReceipt(wagmiConfig, {
              hash,
              chainId: action.chainId,
            });

        return {
          id: action.id,
          status: receipt.status === "success" ? "success" : "failed",
          hash,
          blockNumber: Number(receipt.blockNumber),
          startedAt,
          endedAt: Date.now(),
          error:
            receipt.status === "success"
              ? undefined
              : "Transaction reverted",
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // wagmi/viem include a "User rejected" string on wallet deny.
        const rejected = /rejected|denied|user/i.test(msg);
        return {
          id: action.id,
          status: rejected ? "rejected" : "failed",
          error: msg.slice(0, 300),
          startedAt,
          endedAt: Date.now(),
        };
      } finally {
        setRunning(null);
      }
    },
    [address, walletChainId]
  );

  return { execute, running };
}
