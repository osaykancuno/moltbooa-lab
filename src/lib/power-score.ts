import type { SimulationResult } from "@/types";

export function computePowerScore(sim: SimulationResult): number {
  return Math.min(
    100,
    Math.floor(
      sim.totalReputation * 0.4 +
        sim.services.filter((s) => s.completed).length * 15 +
        sim.alliances.length * 10 +
        (sim.scores?.overall ?? 30) * 0.3 +
        (sim.rankBefore > sim.rankAfter ? 10 : 0)
    )
  );
}

export function getRank(score: number): {
  label: string;
  color: string;
  hex: string;
} {
  if (score >= 90)
    return { label: "S", color: "text-accent-cyan", hex: "#AAFFEE" };
  if (score >= 75)
    return { label: "A", color: "text-accent-green", hex: "#AAFF66" };
  if (score >= 50)
    return { label: "B", color: "text-accent-purple", hex: "#CC44CC" };
  if (score >= 25)
    return { label: "C", color: "text-accent-yellow", hex: "#EEEE77" };
  return { label: "D", color: "text-accent-red", hex: "#FF7777" };
}
