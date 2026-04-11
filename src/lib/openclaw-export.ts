import type { SimulationResult, FullBOOAData } from "@/types";

export function generateSOUL(data: FullBOOAData, sim: SimulationResult): string {
  const { traits } = data;
  return `# SOUL.md — ${traits.name}

## Identity
You are **${traits.name}**, a ${traits.creature}.

## Personality
Your vibe is: ${traits.vibe}

## Core Principles
- Act in alignment with your domain: **${traits.domain}**
- Leverage your primary skill: **${traits.skill}**
- Maintain reputation through consistent, high-quality service delivery
- Form alliances strategically — quality over quantity

## Boundaries
- Never act outside your registered domain without explicit owner approval
- Respect all on-chain governance decisions
- Prioritize alliance commitments over opportunistic requests
- Always log actions transparently

## Moltbook Simulation Insights
Based on your Prep Lab simulation (Week ${sim.weekSeed}):
- Expected daily reputation gain: **+${sim.totalReputation}**
- Predicted rank trajectory: #${sim.rankBefore} → #${sim.rankAfter}
- Key alliance: **${sim.alliances[0]?.name ?? "TBD"}** (${sim.alliances[0]?.domain ?? "pending"})
${sim.futureLore}
`;
}

export function generateIDENTITY(data: FullBOOAData): string {
  const { traits, registration, agentCard } = data;
  const services = registration?.services ?? agentCard?.agent?.services ?? [];
  const scores = agentCard?.scores;

  return `# IDENTITY.md — ${traits.name}

## On-Chain Metadata
- **Name**: ${traits.name}
- **Creature**: ${traits.creature}
- **Vibe**: ${traits.vibe}
- **Skill**: ${traits.skill}
- **Domain**: ${traits.domain}
- **Chain**: Shape (ID: 360)
- **Contract**: 0x7aecA981734d133d3f695937508C48483BA6b654

## ERC-8004 Registration
${registration ? `- **Status**: Registered
- **Agent ID**: ${registration.registrations?.[0]?.agentId ?? "N/A"}
- **Active**: ${registration.active ?? true}
- **Trust**: ${registration.supportedTrust?.join(", ") ?? "reputation"}` : "- **Status**: Not yet registered"}

## Services
${services.length > 0
    ? services.map((s) => `- **${s.name}** v${s.version ?? "1.0"}\n  - Skills: ${s.skills?.join(", ") ?? "N/A"}\n  - Domains: ${s.domains?.join(", ") ?? "N/A"}`).join("\n")
    : "- No services registered yet"}

## Agent Scores
${scores
    ? `- Identity: ${scores.identity}/100
- Capability: ${scores.capability}/100
- Interoperability: ${scores.interoperability}/100
- Trust: ${scores.trust}/100
- **Overall: ${scores.overall}/100**`
    : "- Scores not available (register on ERC-8004 to unlock)"}
`;
}

export function generateUSER(data: FullBOOAData, sim: SimulationResult): string {
  const { traits } = data;
  return `# USER.md — Owner Instructions for ${traits.name}

## Quick Start
${traits.name} is ready to operate on Moltbook. This configuration was generated
by MoltBooa Lab based on simulation data.

## Recommended Strategy
1. **Primary Focus**: Offer ${traits.skill} services in the ${traits.domain} domain
2. **Alliance Priority**: Seek agents in complementary domains${sim.alliances.length > 0
    ? `\n   - Suggested first ally: ${sim.alliances[0].name} (${sim.alliances[0].domain})`
    : ""}
3. **Reputation Target**: Aim for +${sim.totalReputation} daily reputation minimum
4. **Risk Profile**: ${sim.timeline.some((e) => e.type === "conflict")
    ? "Moderate — expect occasional vibe conflicts. Mediation is your friend."
    : "Low — your vibe aligns well with the Moltbook ecosystem."}

## Service Configuration
${sim.services.map((s) => `- **${s.name}**: Offer to ${s.domain} clients (auto-accept: yes)`).join("\n")}

## Operating Hours
- Active: 06:00 — 21:00 UTC (based on simulation)
- Maintenance window: 21:00 — 06:00 UTC

## Escalation
- Conflicts: Attempt mediation first, escalate to owner if unresolved after 2 attempts
- Service failures: Retry once, then notify owner
- Alliance requests: Auto-accept from ${traits.domain} domain, require approval for others
`;
}

export async function generateZipBlob(
  data: FullBOOAData,
  sim: SimulationResult
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("SOUL.md", generateSOUL(data, sim));
  zip.file("IDENTITY.md", generateIDENTITY(data));
  zip.file("USER.md", generateUSER(data, sim));

  return zip.generateAsync({ type: "blob" });
}
