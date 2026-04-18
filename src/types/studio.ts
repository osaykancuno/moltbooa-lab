import type { AgentRegistration, AgentCard } from "./index";

export type RegistrationStatus = "registered" | "unregistered";
export type EndpointStatus = "set" | "unset";

export interface AgentOnChainState {
  tokenId: string;
  owner: `0x${string}` | null;
  registration: AgentRegistration | null;
  agentCard: AgentCard | null;
  // Derived flags for cockpit badges
  registrationStatus: RegistrationStatus;
  endpointStatus: EndpointStatus;
  endpointUrl: string | null;
  servicesCount: number;
}
