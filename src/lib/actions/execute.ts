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
 * We also `waitForTransactionReceipt` on tx-kind actions so we can give the
 * user a definitive success/fail and feed the block number back to the LLM.
 */

import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  sendTransaction,
  signMessage,
  signTypedData,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi-config";
import type { AgentAction, ActionResult } from "./types";
import { TARGET_CHAIN_ID } from "./types";

export function useExecuteAction() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
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

        let hash: `0x${string}`;
        if (action.kind === "contract") {
          hash = await writeContract(wagmiConfig, {
            address: action.address,
            abi: action.abi,
            functionName: action.functionName,
            args: action.args,
            value: action.value ? BigInt(action.value) : undefined,
            chainId: TARGET_CHAIN_ID,
            account: address,
          });
        } else {
          // raw tx
          hash = await sendTransaction(wagmiConfig, {
            to: action.to,
            data: action.data,
            value: action.value ? BigInt(action.value) : undefined,
            chainId: TARGET_CHAIN_ID,
            account: address,
          });
        }

        // Wait for the receipt so we know if the tx actually succeeded.
        const receipt = publicClient
          ? await publicClient.waitForTransactionReceipt({ hash })
          : await waitForTransactionReceipt(wagmiConfig, { hash });

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
    [address, publicClient]
  );

  return { execute, running };
}
