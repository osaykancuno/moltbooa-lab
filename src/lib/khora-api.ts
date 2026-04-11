import type {
  BOOAToken,
  BOOATraits,
  AgentRegistration,
  AgentCard,
  FullBOOAData,
  WalletNFT,
} from "@/types";

function extractTraitsFromRegistration(
  reg: AgentRegistration,
  tokenName: string
): BOOATraits {
  const service = reg.services?.[0];
  const skills = service?.skills ?? [];
  const domains = service?.domains ?? [];

  // Clean up OASF taxonomy paths (e.g. "agent_orchestration/task_decomposition" -> "task decomposition")
  const cleanSkill = (s: string) => s.split("/").pop()?.replace(/_/g, " ") ?? s;
  const cleanDomain = (d: string) => d.split("/").pop()?.replace(/_/g, " ") ?? d;

  return {
    name: reg.name || tokenName,
    creature: reg.description || "",
    vibe: "", // Will be enriched by simulation engine
    skill: skills.length > 0 ? cleanSkill(skills[0]) : "multi-agent planning",
    domain: domains.length > 0 ? cleanDomain(domains[0]) : "automation",
  };
}

function extractTraitsFromGallery(tokenName: string, tokenId: string): BOOATraits {
  // Generate deterministic traits for unregistered BOOAs
  const hash = Math.abs(
    tokenId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  );
  const skills = ["task decomposition", "multi-agent planning", "data analysis", "code generation", "threat detection", "negotiation"];
  const domains = ["automation", "cybersecurity", "defi", "governance", "social", "analytics"];

  return {
    name: tokenName.replace(/^BOOA #/, "BOOA-"),
    creature: "Autonomous on-chain entity awaiting activation",
    vibe: "Mysterious, adaptive, potential-laden",
    skill: skills[hash % skills.length],
    domain: domains[hash % domains.length],
  };
}

export async function fetchFullBOOA(tokenId: string): Promise<FullBOOAData> {
  // Use our proxy API to avoid CORS
  const res = await fetch(`/api/booa/${tokenId}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch BOOA #${tokenId}`);
  }

  const { gallery, registration, agentCard } = await res.json();

  // Build token object
  const token: BOOAToken = {
    tokenId,
    name: gallery.name,
    description: registration?.description ?? "",
    image: gallery.svg || gallery.imageUrl || "",
    attributes: [],
  };

  // Extract traits
  const traits = registration
    ? extractTraitsFromRegistration(registration, gallery.name)
    : extractTraitsFromGallery(gallery.name, tokenId);

  return {
    token,
    traits,
    registration: registration as AgentRegistration | null,
    agentCard: agentCard as AgentCard | null,
  };
}

export async function fetchWalletBOOAs(
  address: string
): Promise<WalletNFT[]> {
  const res = await fetch(`/api/wallet-nfts?address=${address}`);
  if (!res.ok) throw new Error(`Failed to fetch wallet NFTs: ${res.status}`);
  const data = await res.json();
  return (data.nfts || []).map(
    (n: Record<string, unknown>) => ({
      contractAddress: n.contractAddress as string,
      tokenId: n.tokenId as string,
      name: n.name as string,
      description: n.description as string,
      image: n.image as string,
      collection: n.collection as string,
    })
  );
}

export function getRandomTokenId(): string {
  return String(Math.floor(Math.random() * 3333));
}
