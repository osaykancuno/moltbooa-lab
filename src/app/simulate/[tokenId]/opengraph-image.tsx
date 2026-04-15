import { ImageResponse } from "next/og";
import { fetchFullBOOAServer } from "@/lib/khora-api-server";
import { simulate } from "@/lib/simulation-engine";
import { computePowerScore, getRank } from "@/lib/power-score";

export const runtime = "nodejs";
export const alt = "MoltBooa Lab — BOOA simulation card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const data = await fetchFullBOOAServer(tokenId);

  // Fallback card if BOOA can't be loaded
  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0a0a0f",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#AAFFEE",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          <div>MOLTBOOA LAB</div>
          <div style={{ fontSize: 28, color: "#777", marginTop: 24 }}>
            BOOA #{tokenId}
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const sim = simulate(data.traits, data.agentCard?.scores ?? null, tokenId);
  const power = computePowerScore(sim);
  const rank = getRank(power);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0a0a0f 0%, #15101f 50%, #0a0a0f 100%)",
          display: "flex",
          flexDirection: "column",
          padding: 60,
          fontFamily: "monospace",
          color: "#fff",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#AAFFEE",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: "#15101f",
                border: "2px solid #AAFFEE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#AAFFEE",
              }}
            >
              MB
            </div>
            MOLTBOOA LAB
          </div>
          <div style={{ color: "#777", fontSize: 22 }}>
            BOOA #{tokenId} / 3333
          </div>
        </div>

        {/* Main row */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 60,
          }}
        >
          {/* Left: name + traits */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: "#AAFFEE",
                lineHeight: 1,
                letterSpacing: -1,
              }}
            >
              {data.traits.name.toUpperCase().slice(0, 18)}
            </div>
            <div
              style={{
                fontSize: 28,
                color: "#CC44CC",
                lineHeight: 1.3,
              }}
            >
              {(data.traits.creature || "on-chain agent").slice(0, 60)}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "8px 16px",
                  background: "rgba(170, 255, 238, 0.1)",
                  border: "1px solid rgba(170, 255, 238, 0.4)",
                  color: "#AAFFEE",
                  fontSize: 20,
                  borderRadius: 4,
                }}
              >
                {data.traits.skill}
              </div>
              <div
                style={{
                  padding: "8px 16px",
                  background: "rgba(204, 68, 204, 0.1)",
                  border: "1px solid rgba(204, 68, 204, 0.4)",
                  color: "#CC44CC",
                  fontSize: 20,
                  borderRadius: 4,
                }}
              >
                {data.traits.domain}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 16,
                color: "#888",
                fontSize: 22,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#666", fontSize: 16 }}>REP</span>
                <span style={{ color: "#AAFF66", fontSize: 28 }}>
                  +{sim.totalReputation}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#666", fontSize: 16 }}>RANK</span>
                <span style={{ color: "#EEEE77", fontSize: 28 }}>
                  #{sim.rankAfter}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#666", fontSize: 16 }}>ALLIES</span>
                <span style={{ color: "#CC44CC", fontSize: 28 }}>
                  {sim.alliances.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right: power score circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: "50%",
                border: `8px solid ${rank.hex}`,
                background: "#0a0a0f",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 60px ${rank.hex}40`,
              }}
            >
              <div
                style={{
                  fontSize: 110,
                  fontWeight: 900,
                  color: rank.hex,
                  lineHeight: 1,
                }}
              >
                {power}
              </div>
              <div style={{ color: "#666", fontSize: 22, marginTop: 4 }}>
                / 100
              </div>
            </div>
            <div
              style={{
                padding: "12px 32px",
                background: "#15101f",
                border: `2px solid ${rank.hex}`,
                color: rank.hex,
                fontSize: 32,
                fontWeight: 900,
                borderRadius: 999,
              }}
            >
              RANK {rank.label}
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #222",
            color: "#666",
            fontSize: 20,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>BORN ON-CHAIN OWNED AGENTS · SHAPE NETWORK</div>
          <div>moltbooa-lab.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
