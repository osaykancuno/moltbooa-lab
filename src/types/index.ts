// ── BOOA / Khora Types ──

export interface BOOAToken {
  tokenId: string;
  name: string;
  description: string;
  image: string; // SVG data URI or URL
  attributes: BOOAAttribute[];
}

export interface BOOAAttribute {
  trait_type: string;
  value: string;
}

export interface BOOATraits {
  name: string;
  creature: string;
  vibe: string;
  skill: string;
  domain: string;
}

export interface AgentRegistration {
  type: string;
  name: string;
  description: string;
  image: string;
  services: AgentService[];
  registrations?: { agentId: number; agentRegistry: string }[];
  registeredBy?: string;
  active?: boolean;
  x402Support?: boolean;
  supportedTrust?: string[];
}

export interface AgentService {
  name: string;
  version?: string;
  skills?: string[];
  domains?: string[];
  endpoint?: string;
}

export interface AgentCard {
  agent: {
    id: number;
    chain: string;
    chainId: number;
    chainName: string;
    owner: string;
    name: string;
    description: string;
    image: string;
    services: AgentService[];
    skills: string[];
    domains: string[];
    x402Support: boolean;
    supportedTrust: string[];
    active: boolean;
  };
  scores: AgentScores;
}

export interface AgentScores {
  identity: number;
  capability: number;
  interoperability: number;
  trust: number;
  overall: number;
}

// ── Simulation Types ──

export type EventType = "boot" | "service" | "alliance" | "conflict" | "reputation" | "complete" | "shutdown";

export interface SimulationEvent {
  time: string; // "06:00"
  type: EventType;
  description: string;
  reputationDelta: number;
}

export interface SimulatedAlly {
  name: string;
  tokenId: string;
  domain: string;
  creature: string;
}

export interface SimulatedService {
  name: string;
  client: string;
  domain: string;
  completed: boolean;
}

export interface SimulationResult {
  booa: BOOATraits;
  scores: AgentScores | null;
  timeline: SimulationEvent[];
  totalReputation: number;
  rankBefore: number;
  rankAfter: number;
  services: SimulatedService[];
  alliances: SimulatedAlly[];
  futureLore: string;
  weekSeed: number;
}

// ── Full BOOA Data (combined from all API calls) ──

export interface FullBOOAData {
  token: BOOAToken;
  traits: BOOATraits;
  registration: AgentRegistration | null;
  agentCard: AgentCard | null;
}

// ── Gallery / Wallet Types ──

export interface WalletNFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
}
