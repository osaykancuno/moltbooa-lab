import type { AgentOnChainState } from "@/types/studio";
import { fetchFullBOOA } from "@/lib/khora-api";

/**
 * Reads the current on-chain state of a BOOA's agent card via the Khora API
 * (which mirrors ERC-8004 + OASF registrations). Ownership must be verified
 * separately via `ownerOf()` on the BOOA contract — that's done by
 * OwnershipGate with wagmi, not here.
 *
 * Returns null for owner; callers plug that in after on-chain read.
 */
export async function fetchAgentCard(
  tokenId: string
): Promise<Omit<AgentOnChainState, "owner">> {
  const data = await fetchFullBOOA(tokenId);

  const registration = data.registration;
  const service = registration?.services?.[0] ?? null;
  const endpointUrl = service?.endpoint?.trim() || null;
  const servicesCount = registration?.services?.length ?? 0;

  return {
    tokenId,
    registration,
    agentCard: data.agentCard,
    registrationStatus: registration ? "registered" : "unregistered",
    endpointStatus: endpointUrl ? "set" : "unset",
    endpointUrl,
    servicesCount,
  };
}
