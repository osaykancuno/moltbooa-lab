"use client";

import Link from "next/link";
import type { AgentOnChainState } from "@/types/studio";

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

  // Decide which step is "current" so the button styling tells the user
  // where to click next without reading anything.
  const nextStep: "register" | "endpoint" | "done" = !registered
    ? "register"
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
                : "Declare a public identity. Requires one Shape tx."
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
                : "Optional — declare OASF skills to be discoverable."
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
            {nextStep === "register"
              ? "Register your BOOA on ERC-8004. This takes one Shape transaction. Your wallet will prompt you to confirm."
              : "Deploy (or link) an endpoint. You don't need to write code — we ship a ready-to-deploy template."}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-foreground/50 tracking-wider">
          ── ACTIONS ──
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FixButton
            href={`/studio/${state.tokenId}/register`}
            label={registered ? "UPDATE IDENTITY" : "REGISTER (ERC-8004)"}
            tone={nextStep === "register" ? "primary" : "neutral"}
          />
          <FixButton
            href={`/studio/${state.tokenId}/endpoint`}
            label={endpointSet ? "UPDATE ENDPOINT" : "SET ENDPOINT"}
            tone={nextStep === "endpoint" ? "primary" : "neutral"}
          />
          <FixButton
            href={`/studio/${state.tokenId}/services`}
            label="MANAGE SERVICES"
            tone="neutral"
          />
        </div>
      </section>
    </div>
  );
}

function FixButton({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "primary" | "neutral";
}) {
  const cls =
    tone === "primary"
      ? "bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 ring-2 ring-accent-purple/30"
      : "bg-card-bg border-card-border text-foreground/60 hover:text-foreground/90";
  return (
    <Link
      href={href}
      className={`text-center text-[10px] px-3 py-3 rounded border font-[family-name:var(--font-pixel)] transition-all ${cls}`}
    >
      {label}
    </Link>
  );
}
