import type {
  BOOAToken,
  BOOATraits,
  AgentRegistration,
  AgentCard,
  FullBOOAData,
} from "@/types";
import { KHORA_API_BASE, BOOA_CONTRACT, SHAPE_CHAIN_ID } from "./constants";

/**
 * Server-side BOOA fetch (no /api proxy needed — server can call khora.fun directly).
 * Used by OG image generation, RSC, and other server-only contexts.
 */

function extractTraitsFromRegistration(
  reg: AgentRegistration,
  tokenName: string
): BOOATraits {
  const service = reg.services?.[0];
  const skills = service?.skills ?? [];
  const domains = service?.domains ?? [];
  const cleanSkill = (s: string) => s.split("/").pop()?.replace(/_/g, " ") ?? s;
  const cleanDomain = (d: string) => d.split("/").pop()?.replace(/_/g, " ") ?? d;

  return {
    name: reg.name || tokenName,
    creature: reg.description || "",
    vibe: "",
    skill: skills.length > 0 ? cleanSkill(skills[0]) : "multi-agent planning",
    domain: domains.length > 0 ? cleanDomain(domains[0]) : "automation",
  };
}

function extractTraitsFromGallery(tokenName: string, tokenId: string): BOOATraits {
  const hash = Math.abs(
    tokenId
      .split("")
      .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  );
  const skills = [
    "task decomposition",
    "multi-agent planning",
    "data analysis",
    "code generation",
    "threat detection",
    "negotiation",
  ];
  const domains = [
    "automation",
    "cybersecurity",
    "defi",
    "governance",
    "social",
    "analytics",
  ];

  return {
    name: tokenName.replace(/^BOOA #/, "BOOA-"),
    creature: "Autonomous on-chain entity awaiting activation",
    vibe: "Mysterious, adaptive, potential-laden",
    skill: skills[hash % skills.length],
    domain: domains[hash % domains.length],
  };
}

export async function fetchFullBOOAServer(
  tokenId: string
): Promise<FullBOOAData | null> {
  const num = Number(tokenId);
  if (!Number.isInteger(num) || num < 0 || num > 3332) return null;

  try {
    const [galleryRes, registryRes] = await Promise.all([
      fetch(
        `${KHORA_API_BASE}/api/gallery?contract=${BOOA_CONTRACT}&chain=shape&startToken=${tokenId}&limit=1`,
        { next: { revalidate: 3600 } }
      ),
      fetch(
        `${KHORA_API_BASE}/api/agent-registry/${SHAPE_CHAIN_ID}/${tokenId}`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    if (!galleryRes.ok) return null;
    const galleryData = await galleryRes.json();
    const galleryToken = galleryData.tokens?.[0];
    if (!galleryToken || galleryToken.tokenId !== tokenId) return null;

    let registration: AgentRegistration | null = null;
    if (registryRes.ok) {
      const regData = await registryRes.json();
      if (regData && regData.name) registration = regData;
    }

    let agentCard: AgentCard | null = null;
    if (registration?.registrations?.length) {
      const agentId = registration.registrations[0].agentId;
      try {
        const cardRes = await fetch(
          `${KHORA_API_BASE}/api/agent-card?chain=shape&agentId=${agentId}`,
          { next: { revalidate: 3600 } }
        );
        if (cardRes.ok) agentCard = await cardRes.json();
      } catch {
        // optional
      }
    }

    const token: BOOAToken = {
      tokenId,
      name: galleryToken.name,
      description: registration?.description ?? "",
      image: galleryToken.svg || galleryToken.imageUrl || "",
      attributes: [],
    };

    const traits = registration
      ? extractTraitsFromRegistration(registration, galleryToken.name)
      : extractTraitsFromGallery(galleryToken.name, tokenId);

    return { token, traits, registration, agentCard };
  } catch {
    return null;
  }
}
