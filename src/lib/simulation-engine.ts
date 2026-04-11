import type {
  BOOATraits,
  AgentScores,
  SimulationEvent,
  SimulatedAlly,
  SimulatedService,
  SimulationResult,
  EventType,
} from "@/types";
import {
  CREATURE_TYPES,
  ALLY_NAME_PREFIXES,
  ALLY_NAME_SUFFIXES,
  DOMAIN_TYPES,
  SERVICE_NAMES,
  SKILL_TYPES,
} from "./constants";
import { generateFutureLore } from "./lore-generator";

// Deterministic seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function generateAlly(rng: () => number): SimulatedAlly {
  const prefix = pick(ALLY_NAME_PREFIXES, rng);
  const suffix = pick(ALLY_NAME_SUFFIXES, rng);
  return {
    name: `${prefix}${suffix}`,
    tokenId: `#${randInt(0, 3332, rng)}`,
    domain: pick(DOMAIN_TYPES, rng),
    creature: pick(CREATURE_TYPES, rng),
  };
}

function generateService(
  traits: BOOATraits,
  rng: () => number
): SimulatedService {
  const skill = traits.skill || pick(SKILL_TYPES, rng);
  return {
    name: skill,
    client: pick(SERVICE_NAMES, rng),
    domain: traits.domain || pick(DOMAIN_TYPES, rng),
    completed: rng() > 0.15,
  };
}

export function simulate(
  traits: BOOATraits,
  scores: AgentScores | null,
  tokenId: string
): SimulationResult {
  const weekSeed = getWeekNumber();
  const seed = hashString(tokenId) + weekSeed * 7919;
  const rng = mulberry32(seed);

  const timeline: SimulationEvent[] = [];
  let cumulativeRep = 0;

  // Boot event
  timeline.push({
    time: "06:00",
    type: "boot",
    description: `${traits.name} connects to Moltbook — the front page of the agent internet — identity verified via ERC-8004`,
    reputationDelta: 0,
  });

  // Generate 2-3 services
  const serviceCount = randInt(2, 3, rng);
  const services: SimulatedService[] = [];
  for (let i = 0; i < serviceCount; i++) {
    services.push(generateService(traits, rng));
  }

  // Service offer event
  const firstService = services[0];
  const serviceRep = randInt(8, 20, rng);
  cumulativeRep += serviceRep;
  timeline.push({
    time: "07:15",
    type: "service",
    description: `OASF_SERVICE_OFFER: ${firstService.name} (OASF-classified) → accepted by ${pick(ALLY_NAME_PREFIXES, rng)}${pick(ALLY_NAME_SUFFIXES, rng)}#${randInt(0, 3332, rng)}`,
    reputationDelta: serviceRep,
  });

  // Generate 1-2 alliances
  const allianceCount = randInt(1, 2, rng);
  const alliances: SimulatedAlly[] = [];
  for (let i = 0; i < allianceCount; i++) {
    alliances.push(generateAlly(rng));
  }

  // Alliance event
  const allianceRep = randInt(5, 15, rng);
  cumulativeRep += allianceRep;
  timeline.push({
    time: "09:30",
    type: "alliance",
    description: `ALLIANCE_FORMED: ${traits.name} <> ${alliances[0].name}${alliances[0].tokenId} — cross-domain collaboration on ${alliances[0].domain}, both ERC-8004 registered`,
    reputationDelta: allianceRep,
  });

  // Reputation checkpoint
  timeline.push({
    time: "12:00",
    type: "reputation",
    description: `REPUTATION_GAIN: +${cumulativeRep} (cumulative: +${cumulativeRep})`,
    reputationDelta: 0,
  });

  // Possible conflict (based on vibe)
  const vibeHash = hashString(traits.vibe || "neutral");
  const hasConflict = (vibeHash + weekSeed) % 3 === 0;
  if (hasConflict) {
    const conflictRep = randInt(-5, 3, rng);
    cumulativeRep += conflictRep;
    const rival = `${pick(ALLY_NAME_PREFIXES, rng)}${pick(ALLY_NAME_SUFFIXES, rng)}#${randInt(0, 3332, rng)}`;
    const resolution = pick(
      ["resolved via on-chain governance vote on Shape Network", "settled by ERC-8004 identity-weighted arbitration", "defused through OASF-mediated negotiation protocol", "ended in mutual respect — both agents staked reputation on-chain"],
      rng
    );
    timeline.push({
      time: "14:45",
      type: "conflict" as EventType,
      description: `CONFLICT: vibe clash with ${rival} — ${resolution}`,
      reputationDelta: conflictRep,
    });
  }

  // Service completion
  if (services.length > 1) {
    const svc = services[1];
    const completeRep = randInt(10, 25, rng);
    cumulativeRep += completeRep;
    timeline.push({
      time: "18:00",
      type: "complete",
      description: `SERVICE_COMPLETE: ${svc.name} for ${svc.client}`,
      reputationDelta: completeRep,
    });
  }

  // Day end
  const rankBefore = randInt(50, 500, rng);
  const rankDelta = Math.floor(cumulativeRep * (0.5 + rng() * 0.8));
  const rankAfter = Math.max(1, rankBefore - rankDelta);

  timeline.push({
    time: "21:00",
    type: "shutdown",
    description: `DAY_END: reputation +${cumulativeRep}, rank #${rankBefore} → #${rankAfter} — synced to Shape Network via SSTORE2`,
    reputationDelta: 0,
  });

  const futureLore = generateFutureLore(traits, cumulativeRep, alliances, rng);

  return {
    booa: traits,
    scores,
    timeline,
    totalReputation: cumulativeRep,
    rankBefore,
    rankAfter,
    services,
    alliances,
    futureLore,
    weekSeed,
  };
}
