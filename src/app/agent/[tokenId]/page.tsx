import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import AgentChatLive from "@/components/studio/AgentChatLive";
import { fetchFullBOOAServer } from "@/lib/khora-api-server";
import { validateEndpointUrl } from "@/lib/endpoint-validator";

function isValidTokenId(s: string): boolean {
  return /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  if (!isValidTokenId(tokenId)) return {};
  const data = await fetchFullBOOAServer(tokenId);
  const name = data?.traits.name ?? `BOOA #${tokenId}`;
  return {
    title: `${name} — live agent`,
    description: `Chat with ${name}, a live on-chain BOOA agent (ERC-8004).`,
    openGraph: {
      title: `${name} — live`,
      description: `Chat with this BOOA agent. Served by its owner's endpoint.`,
      type: "website",
    },
  };
}

export default async function AgentPublicPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  if (!isValidTokenId(tokenId)) notFound();

  const data = await fetchFullBOOAServer(tokenId);

  if (!data) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 text-center space-y-4">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg text-accent-red">
            BOOA #{tokenId} NOT FOUND
          </h1>
          <Link
            href="/"
            className="text-xs text-accent-cyan hover:underline"
          >
            ← Back to Lab
          </Link>
        </main>
      </>
    );
  }

  const endpointRaw = data.registration?.services?.[0]?.endpoint?.trim() ?? "";
  const endpointCheck = endpointRaw
    ? validateEndpointUrl(endpointRaw)
    : ({ ok: false, reason: "no endpoint set" } as const);

  const endpointUrl = endpointCheck.ok ? endpointCheck.url.toString() : null;

  const { traits, token } = data;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg sm:text-xl text-accent-cyan glitch-text">
            {traits.name}
          </h1>
          <p className="text-[10px] text-foreground/40 font-[family-name:var(--font-mono)]">
            BOOA #{tokenId} · live agent
          </p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
          {token.image && (
            <div
              className="w-48 h-48 pixel-canvas rounded mx-auto"
              style={{
                backgroundImage: `url("${token.image}")`,
                backgroundSize: "cover",
                imageRendering: "pixelated",
              }}
            />
          )}
          <div className="space-y-2 text-xs">
            <p className="text-foreground/80 leading-relaxed">
              {traits.creature || "Autonomous on-chain entity."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-[family-name:var(--font-pixel)]">
                {traits.skill}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent-green/10 border border-accent-green/30 text-accent-green font-[family-name:var(--font-pixel)]">
                {traits.domain}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-accent-purple tracking-wider">
            ── LIVE CHAT ──
          </h2>

          {endpointUrl ? (
            <>
              <p className="text-[10px] text-foreground/50 leading-relaxed">
                You&apos;re chatting with a real agent hosted by its owner.
                Messages travel from your browser straight to their endpoint —
                we never see them. Responses depend on the owner&apos;s LLM
                setup.
              </p>
              <AgentChatLive
                tokenId={tokenId}
                agentName={traits.name}
                endpointUrl={endpointUrl}
              />
            </>
          ) : (
            <div className="rounded border border-card-border bg-card-bg p-6 text-center space-y-3">
              <div className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground/60">
                NOT LIVE YET
              </div>
              <p className="text-sm text-foreground/60">
                This agent has no endpoint registered on-chain.
              </p>
              {!endpointCheck.ok && endpointRaw && (
                <p className="text-[10px] text-accent-red font-[family-name:var(--font-mono)]">
                  Endpoint on-chain rejected by safety filter:{" "}
                  {endpointCheck.reason}
                </p>
              )}
              <div className="text-[11px] text-foreground/50 space-y-1 pt-2">
                <p>
                  <strong className="text-foreground/70">
                    Are you the owner?
                  </strong>{" "}
                  Open the{" "}
                  <Link
                    href={`/studio/${tokenId}`}
                    className="text-accent-purple hover:underline"
                  >
                    Studio cockpit
                  </Link>{" "}
                  to set up an endpoint in a few minutes.
                </p>
                <p>
                  <strong className="text-foreground/70">Just visiting?</strong>{" "}
                  You can still explore what this BOOA might do:
                </p>
              </div>
              <Link
                href={`/simulate/${tokenId}`}
                className="inline-block text-[10px] px-4 py-2 rounded border bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/20 font-[family-name:var(--font-pixel)]"
              >
                SIMULATE IN THE LAB →
              </Link>
            </div>
          )}
        </section>

        <div className="pt-6 border-t border-card-border text-center">
          <Link
            href={`/studio/${tokenId}`}
            className="text-[10px] text-foreground/40 hover:text-accent-purple font-[family-name:var(--font-pixel)]"
          >
            ↗ OWNER COCKPIT
          </Link>
        </div>
      </main>
    </>
  );
}
