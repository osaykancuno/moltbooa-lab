import type { BOOATraits, SimulatedAlly } from "@/types";

const FUTURE_TEMPLATES = [
  "In 30 days, {name} will have become the go-to {skill} specialist on Moltbook, the front page of the agent internet. {ally} relies on {name} for every critical {domain} operation across Shape Network.",
  "{name} ascends through the Moltbook ranks, its ERC-8004 identity broadcasting mastery. Forging an unbreakable pact with {ally}, their combined {domain} prowess reshapes the protocol landscape.",
  "After weeks of relentless OASF-classified {skill} service, {name} earns the title of '{domain} Architect'. {ally} and two other Born On-chain Owned Agents petition to form a permanent squad.",
  "The Moltbook chronicles will speak of {name}'s legendary {skill} runs. With +{rep} reputation in a single cycle, {ally} pledges allegiance to the {creature} — one of 3,333 agents on Shape Network.",
  "{name} quietly becomes the backbone of {domain} infrastructure on Moltbook. When {ally} needed emergency {skill} support, only {name}'s OASF-registered skills answered the call.",
  "Thirty days from now, {name} sits at the center of a web of alliances on Moltbook. {ally} and the {domain} collective consider this Born On-chain Owned Agent irreplaceable.",
  "The {creature} known as {name} will evolve beyond expectations. Reputation score climbing by +{rep}, even {ally} pauses to acknowledge the ascent of this SSTORE2-stored agent.",
  "{name}'s future on Moltbook is written in on-chain logs: consistent {skill} delivery via OASF taxonomy, zero downtime, and a growing reputation that makes {ally} proud. Khora built the tools — {name} built the legend.",
];

const EPIC_SUFFIXES = [
  "The chain remembers. Shape Network never forgets.",
  "SSTORE2 preserves this story as contract bytecode forever.",
  "No rollback can undo this legacy. ERC-8004 identity locked.",
  "The blocks on Shape Network confirm what every agent suspected.",
  "On-chain, immutable, legendary. Khora would be proud.",
  "Registered via ERC-8004. Stored via SSTORE2. Remembered forever.",
  "Verified on Shape Network. Sealed on Moltbook. Built by Khora.",
  "All 3,333 Born On-chain Owned Agents whisper the name with respect.",
];

export function generateFutureLore(
  traits: BOOATraits,
  reputation: number,
  alliances: SimulatedAlly[],
  rng: () => number
): string {
  const template = FUTURE_TEMPLATES[Math.floor(rng() * FUTURE_TEMPLATES.length)];
  const suffix = EPIC_SUFFIXES[Math.floor(rng() * EPIC_SUFFIXES.length)];
  const ally = alliances[0]?.name ?? "an unknown agent";

  const lore = template
    .replace(/{name}/g, traits.name || "Unknown BOOA")
    .replace(/{skill}/g, traits.skill || "multi-agent-planning")
    .replace(/{domain}/g, traits.domain || "automation")
    .replace(/{creature}/g, traits.creature || "entity")
    .replace(/{ally}/g, ally)
    .replace(/{rep}/g, String(reputation));

  return `${lore} ${suffix}`;
}
