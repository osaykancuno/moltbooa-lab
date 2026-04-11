import { NextRequest, NextResponse } from "next/server";
import { KHORA_API_BASE, BOOA_CONTRACT, SHAPE_CHAIN_ID } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  const num = Number(tokenId);
  if (!Number.isInteger(num) || num < 0 || num > 3332) {
    return NextResponse.json(
      { error: "Invalid token ID. Must be 0-3332." },
      { status: 400 }
    );
  }

  try {
    // Fetch gallery data and agent registration in parallel
    const [galleryRes, registryRes] = await Promise.all([
      fetch(
        `${KHORA_API_BASE}/api/gallery?contract=${BOOA_CONTRACT}&chain=shape&startToken=${tokenId}&limit=1`
      ),
      fetch(
        `${KHORA_API_BASE}/api/agent-registry/${SHAPE_CHAIN_ID}/${tokenId}`
      ),
    ]);

    if (!galleryRes.ok) {
      return NextResponse.json(
        { error: `Gallery API error: ${galleryRes.status}` },
        { status: 502 }
      );
    }

    const galleryData = await galleryRes.json();
    const galleryToken = galleryData.tokens?.[0];

    if (!galleryToken || galleryToken.tokenId !== tokenId) {
      return NextResponse.json(
        { error: `BOOA #${tokenId} not found.` },
        { status: 404 }
      );
    }

    // Parse registration (may fail or return empty)
    let registration = null;
    if (registryRes.ok) {
      const regData = await registryRes.json();
      if (regData && regData.name) {
        registration = regData;
      }
    }

    // Fetch agent card if registered
    let agentCard = null;
    if (registration?.registrations?.length) {
      const agentId = registration.registrations[0].agentId;
      try {
        const cardRes = await fetch(
          `${KHORA_API_BASE}/api/agent-card?chain=shape&agentId=${agentId}`
        );
        if (cardRes.ok) {
          agentCard = await cardRes.json();
        }
      } catch {
        // Agent card is optional
      }
    }

    return NextResponse.json({
      gallery: galleryToken,
      registration,
      agentCard,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
