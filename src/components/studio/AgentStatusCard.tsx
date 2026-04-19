"use client";

import Link from "next/link";
import type { AgentOnChainState } from "@/types/studio";
import { KHORA_BRIDGE_URL } from "@/lib/constants";

interface Props {
  state: AgentOnChainState;
}

function Badge({
  label,
  ok,
  hint,
  help,
}: {
  label: string;
  ok: boolean;
  hint: string;
  help: string;
}) {
  return (
    <div
      className={`rounded border p-3 flex flex-col gap-1.5 ${
        ok
          ? "bg-accent-green/10 border-accent-green/40"
          : "bg-card-bg border-card-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`font-[family-name:var(--font-pixel)] text-[10px] ${
            ok ? "text-accent-green" : "text-foreground/50"
          }`}
        >
          {label}
        </div>
        <div
          className={`text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-pixel)] ${
            ok
              ? "bg-accent-green/20 text-accent-green"
              : "bg-foreground/10 text-foreground/50"
          }`}
        >
          {ok ? "OK" : "TODO"}
        </div>
      </div>
      <div
        className={`text-[11px] ${
          ok ? "text-accent-green" : "text-foreground/40"
        } font-[family-name:var(--font-mono)] truncate`}
        title={hint}
      >
        {hint}
      </div>
      <div className="text-[10px] text-foreground/50 leading-snug">{help}</div>
    </div>
  );
}

export default function AgentStatusCard({ state }: Props) {
  const registered = state.registrationStatus === "registered";
  const endpointSet = state.endpointStatus === "set";
  const live = registered && endpointSet;

  // Registration is delegated to khora.fun/bridge — the community tool.
  // Our owned action is the endpoint. Highlight ENDPOINT as "current" when
  // identity is already registered but endpoint isn't set yet.
  const nextStep: "identity" | "endpoint" | "done" = !registered
    ? "identity"
    : !endpointSet
      ? "endpoint"
      : "done";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-accent-purple tracking-wider">
          ── AGENT STATUS ──
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Badge
            label="1 · IDENTITY"
            ok={registered}
            hint={registered ? "REGISTERED" : "NOT REGISTERED"}
            help={
              registered
                ? "Your BOOA is visible on-chain to other agents."
                : "Register via Khôra Bridge (community tool)."
            }
          />
          <Badge
            label="2 · ENDPOINT"
            ok={endpointSet}
            hint={endpointSet ? (state.endpointUrl ?? "SET") : "NOT SET"}
            help={
              endpointSet
                ? "Your agent responds at the URL above."
                : "Deploy the chat endpoint on your own free-tier host."
            }
          />
          <Badge
            label="3 · SERVICES"
            ok={state.servicesCount > 0}
            hint={`${state.servicesCount} declared`}
            help={
              state.servicesCount > 0
                ? "Skills + domains advertised on-chain."
                : "Auto-filled at registration time."
            }
          />
        </div>
      </section>

      {live ? (
        <section className="gradient-border rounded-lg p-5 text-center space-y-2">
          <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-green">
            ✓ YOUR AGENT IS LIVE
          </div>
          <p className="text-[11px] text-foreground/60">
            Share this public chat link — anyone can talk to your BOOA.
          </p>
          <Link
            href={`/agent/${state.tokenId}`}
            className="inline-block mt-2 text-xs text-accent-cyan hover:underline font-[family-name:var(--font-mono)] break-all"
          >
            /agent/{state.tokenId}
          </Link>
        </section>
      ) : (
        <section className="rounded border border-accent-purple/40 bg-accent-purple/5 p-4 space-y-2">
          <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple">
            NEXT STEP
          </div>
          <p className="text-[11px] text-foreground/70">
            {nextStep === "identity" ? (
              <>
                Register your BOOA on ERC-8004 via{" "}
                <a
                  href={KHORA_BRIDGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-cyan hover:underline"
                >
                  Khôra Bridge ↗
                </a>
                . It&apos;s the community tool that runs the canonical
                registry — one Shape transaction from your wallet. Come
                back here after.
              </>
            ) : (
              "Deploy (or link) an endpoint. You don't need to write code — we ship a ready-to-deploy template."
            )}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-foreground/50 tracking-wider">
          ── ACTIONS ──
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ExternalActionButton
            href={KHORA_BRIDGE_URL}
            label={registered ? "UPDATE ON KHÔRA ↗" : "REGISTER ON KHÔRA ↗"}
            tone={nextStep === "identity" ? "primary" : "neutral"}
          />
          <ActionButton
            href={`/studio/${state.tokenId}/endpoint`}
            label={endpointSet ? "UPDATE ENDPOINT" : "SET ENDPOINT"}
            tone={nextStep === "endpoint" ? "primary" : "neutral"}
          />
          <ActionButton
            href={`/studio/${state.tokenId}/services`}
            label="VIEW SERVICES"
            tone="neutral"
          />
        </div>
      </section>
    </div>
  );
}

function btnClass(tone: "primary" | "neutral"): string {
  return tone === "primary"
    ? "bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 ring-2 ring-accent-purple/30"
    : "bg-card-bg border-card-border text-foreground/60 hover:text-foreground/90";
}

function ActionButton({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "primary" | "neutral";
}) {
  return (
    <Link
      href={href}
      className={`text-center text-[10px] px-3 py-3 rounded border font-[family-name:var(--font-pixel)] transition-all ${btnClass(tone)}`}
    >
      {label}
    </Link>
  );
}

function ExternalActionButton({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "primary" | "neutral";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-center text-[10px] px-3 py-3 rounded border font-[family-name:var(--font-pixel)] transition-all ${btnClass(tone)}`}
    >
      {label}
    </a>
  );
}
