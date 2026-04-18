"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AgentOnChainState } from "@/types/studio";
import type { FullBOOAData } from "@/types";
import Steps from "./Steps";
import { KHORA_API_BASE } from "@/lib/constants";

interface Props {
  tokenId: string;
  owner: `0x${string}`;
  state: Omit<AgentOnChainState, "owner">;
  booa: FullBOOAData;
}

interface RegistrationPayload {
  type: "agent-registration";
  name: string;
  description: string;
  image: string;
  services: Array<{
    name: string;
    version: string;
    skills: string[];
    domains: string[];
    endpoint?: string;
  }>;
  registeredBy: string;
}

const DESCRIPTION_LIMIT = 500;

/**
 * Register wizard.
 *
 * ARCHITECTURAL NOTE
 * ──────────────────
 * The final step hands the user off to Khôra's official registry flow at
 * `${KHORA_API_BASE}/booa/<tokenId>` with the payload below pre-filled.
 *
 * Why a handoff instead of `writeContract` directly? The real ABI is now
 * pinned in `src/lib/contracts/erc8004.ts` (verified from the
 * `IdentityRegistryUpgradeable` implementation at
 * `0x7274e874CA62410a93Bd8bf61c69d8045E399c02`). Register is:
 *
 *   register(string agentURI, (string,bytes)[] metadata) → uint256 agentId
 *
 * `agentURI` must resolve to a public JSON blob (ERC-721 tokenURI pattern).
 * Hosting that blob is the real constraint: Khôra already pins the JSON to
 * IPFS and maps `booaTokenId ↔ agentId` off-chain. If we hosted the JSON
 * ourselves we'd have to own pinning + mapping forever — a durable cost
 * that breaks the "free-tier only" rule in the plan.
 *
 * When (or if) we stand up our own JSON host, swap this CTA for a direct
 *   writeContract({ abi: erc8004Abi, functionName: "register", args: [uri, md] })
 * using `pendingTx` / `useWaitForTransactionReceipt`. The payload we build
 * here is already the right shape.
 */
export default function RegisterWizard({
  tokenId,
  owner,
  state,
  booa,
}: Props) {
  const [description, setDescription] = useState(
    state.registration?.description ?? booa.traits.creature ?? ""
  );

  const payload: RegistrationPayload = useMemo(() => {
    const existing = state.registration;
    return {
      type: "agent-registration",
      name: existing?.name ?? booa.traits.name,
      description: description.trim().slice(0, DESCRIPTION_LIMIT),
      image: existing?.image ?? booa.token.image,
      services: existing?.services?.length
        ? existing.services.map((s) => ({
            name: s.name,
            version: s.version ?? "0.1.0",
            skills: s.skills ?? [],
            domains: s.domains ?? [],
            endpoint: s.endpoint,
          }))
        : [
            {
              name: booa.traits.name,
              version: "0.1.0",
              skills: [booa.traits.skill],
              domains: [booa.traits.domain],
            },
          ],
      registeredBy: owner,
    };
  }, [booa, description, owner, state.registration]);

  const khoraUrl = `${KHORA_API_BASE}/booa/${tokenId}`;
  const payloadJson = JSON.stringify(payload, null, 2);
  const [copied, setCopied] = useState(false);

  const overLimit = description.length > DESCRIPTION_LIMIT;
  const isUpdate = state.registrationStatus === "registered";

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payloadJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      <Steps
        heading="── REGISTRATION IN 3 STEPS ──"
        steps={[
          {
            title: "1 · DESCRIBE YOUR AGENT",
            status: "current",
            body: (
              <>
                Write a short public description (≤500 characters). Everything
                else — name, image, skill, domain — is already pulled from
                your BOOA&apos;s on-chain metadata. You can&apos;t break
                anything: this is just what other agents see.
              </>
            ),
          },
          {
            title: "2 · REVIEW THE PAYLOAD",
            body: (
              <>
                Scroll down to preview the exact JSON that will be saved
                on-chain. Copy it if you want a backup.
              </>
            ),
          },
          {
            title: "3 · SIGN ON KHÔRA",
            body: (
              <>
                Click the green button. Khôra&apos;s official registry opens
                in a new tab with your payload ready — confirm the Shape
                transaction in your wallet. You&apos;ll pay a small gas fee
                (usually &lt; $0.01).
              </>
            ),
          },
        ]}
      />

      <section className="space-y-3">
        <label className="block">
          <span className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
            AGENT DESCRIPTION
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={DESCRIPTION_LIMIT + 50}
            placeholder="A fierce little cephalopod-circuit hybrid specialized in threat detection across on-chain cyberpunk networks…"
            className="w-full mt-2 text-xs p-3 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60 font-[family-name:var(--font-mono)] resize-none"
          />
          <div
            className={`text-[10px] mt-1 font-[family-name:var(--font-mono)] ${
              overLimit ? "text-accent-red" : "text-foreground/40"
            }`}
          >
            {description.length} / {DESCRIPTION_LIMIT}
          </div>
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/50">
          PAYLOAD PREVIEW (THIS IS WHAT GETS SIGNED)
        </h3>
        <pre className="text-[10px] p-3 bg-background border border-card-border rounded overflow-x-auto font-[family-name:var(--font-mono)] text-foreground/70 max-h-64">
          {payloadJson}
        </pre>
        <button
          type="button"
          onClick={copyPayload}
          className="text-[10px] px-3 py-1.5 rounded border border-card-border text-foreground/60 hover:text-foreground/90 hover:border-accent-cyan/40 font-[family-name:var(--font-pixel)] transition-colors"
        >
          {copied ? "✓ COPIED" : "COPY PAYLOAD"}
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple">
          {isUpdate ? "SIGN THE UPDATE" : "SIGN THE REGISTRATION"}
        </h3>
        <p className="text-[11px] text-foreground/60 leading-relaxed">
          Registration is finalized on{" "}
          <a
            href="https://khora.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cyan hover:underline"
          >
            khora.fun
          </a>{" "}
          — they operate the canonical ERC-8004 registry for BOOA. Your
          wallet signs the transaction there (you stay in control of the
          key). When the tx confirms, come back here and the cockpit will
          auto-refresh.
        </p>
        <a
          href={khoraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] px-5 py-3 rounded border font-[family-name:var(--font-pixel)] tracking-wider transition-all bg-accent-green/15 border-accent-green/50 text-accent-green hover:bg-accent-green/25"
        >
          {isUpdate ? "UPDATE ON KHÔRA ↗" : "REGISTER ON KHÔRA ↗"}
        </a>

        <details className="pt-2">
          <summary className="text-[10px] text-foreground/40 cursor-pointer hover:text-foreground/60 font-[family-name:var(--font-pixel)]">
            WHY NOT A ONE-CLICK TX FROM HERE?
          </summary>
          <p className="text-[10px] text-foreground/50 leading-relaxed mt-2 pl-4 border-l border-card-border">
            The ERC-8004 <code>register</code> call requires a public JSON URL
            (your agentURI) that Khôra pins to IPFS for you. We send you to
            Khôra so you get the pinning + the BOOA↔agentId mapping for free,
            and you sign the same on-chain transaction you would sign here —
            in your own wallet, on your own gas. Same effect, one less moving
            part.
          </p>
        </details>
      </section>

      <div className="pt-4 border-t border-card-border flex justify-between items-center">
        <Link
          href={`/studio/${tokenId}`}
          className="text-[10px] text-foreground/50 hover:text-foreground/80 font-[family-name:var(--font-pixel)]"
        >
          ← BACK TO COCKPIT
        </Link>
        {isUpdate && (
          <Link
            href={`/agent/${tokenId}`}
            className="text-[10px] text-foreground/50 hover:text-accent-cyan font-[family-name:var(--font-pixel)]"
          >
            VIEW PUBLIC PAGE →
          </Link>
        )}
      </div>
    </div>
  );
}
