import JSZip from "jszip";
import type { FullBOOAData } from "@/types";
import {
  KHORA_API_BASE,
  BOOA_CONTRACT,
  SHAPE_CHAIN_ID,
  ERC_8004_REGISTRY,
} from "@/lib/constants";

/**
 * Endpoint template generator.
 *
 * Produces a ZIP with a complete, deployable Next.js (App Router) project
 * that exposes `POST /chat` honoring our agent protocol:
 *   Request:  { messages: {role, content}[], tokenId?: string }
 *   Response: { content: string }
 *
 * ON-CHAIN AWARENESS
 * ──────────────────
 * The template is wired to the public Khôra API (no key required) through
 * a tiny `lib/khora.ts` module. On every request it:
 *   1. Fetches the BOOA's live agent card (identity, services, endpoint,
 *      registrations) and snapshots it into the system prompt.
 *   2. (Optional, env-gated) exposes OpenAI-compatible tools so capable
 *      models can call `get_booa(id)` / `get_agent_card(id)` /
 *      `get_gallery_top(n)` mid-conversation.
 *
 * Secure-by-default:
 *   - No keys in the ZIP. Only `.env.example` with placeholders.
 *   - System prompt has traits hardcoded (holder can edit soul.md).
 *   - Provider-agnostic: LLM_API_BASE + LLM_API_KEY + LLM_MODEL env vars.
 *   - CORS: `*` by default, README pushes the user to restrict.
 *   - 30s request timeout, 20 req/min per-IP in-memory rate limit.
 *   - 5s timeout + graceful fallback on Khôra lookups (agent answers even
 *     if the chain reader is down).
 *   - No prompt logging.
 */
export async function generateEndpointTemplate(
  data: FullBOOAData
): Promise<Blob> {
  const { traits, token } = data;
  const slug = slugify(traits.name) || `booa-${token.tokenId}`;

  const zip = new JSZip();
  const root = zip.folder(slug)!;

  root.file("package.json", pkgJson(slug));
  root.file("tsconfig.json", TSCONFIG);
  root.file("next.config.mjs", NEXT_CONFIG);
  root.file(".gitignore", GITIGNORE);
  root.file(".env.example", ENV_EXAMPLE);
  root.file("vercel.json", VERCEL_JSON);
  root.file("README.md", readme(data, slug));
  root.file("soul.md", soulMd(data));
  root.file("app/layout.tsx", LAYOUT_TSX);
  root.file("app/page.tsx", pageTsx(data));
  root.file("app/chat/route.ts", chatRouteTs(data));
  root.file("app/health/route.ts", healthRouteTs(data));
  root.file("lib/khora.ts", khoraLibTs());
  root.file("lib/tools.ts", toolsLibTs());

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

// ─────────────────────────── helpers ───────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Escape for safe embedding in a JS/TS template literal. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

// ─────────────────────────── file contents ───────────────────────────

function pkgJson(slug: string): string {
  return (
    JSON.stringify(
      {
        name: slug,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "16.2.3",
          react: "19.2.4",
          "react-dom": "19.2.4",
        },
        devDependencies: {
          "@types/node": "^20",
          "@types/react": "^19",
          "@types/react-dom": "^19",
          typescript: "^5",
        },
      },
      null,
      2
    ) + "\n"
  );
}

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`;

const GITIGNORE = `node_modules
.next
out
.env
.env.local
.DS_Store
*.log
`;

const ENV_EXAMPLE = `# ─── LLM provider (OpenAI-compatible) ───
# Pick one and fill in. Never commit .env — only .env.example.
#
# OpenRouter (recommended, many free-tier models):
#   LLM_API_BASE=https://openrouter.ai/api/v1
#   LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
#
# Groq (fast, free tier):
#   LLM_API_BASE=https://api.groq.com/openai/v1
#   LLM_MODEL=llama-3.1-8b-instant
#
# OpenAI:
#   LLM_API_BASE=https://api.openai.com/v1
#   LLM_MODEL=gpt-4o-mini

LLM_API_BASE=
LLM_API_KEY=
LLM_MODEL=

# ─── Tool calling (optional, required for the Terminal) ───
# When "true", the agent can:
#   · call Khôra read APIs (get_booa, get_agent_card, get_gallery_top)
#   · fetch public https URLs (fetch_url), query CoinGecko spot/history,
#     inspect native balances and gas via public RPC
#   · run consultant reads: get_defillama_protocol, get_defillama_yields,
#     get_token_security (GoPlus), get_nft_floor (Reservoir)
#   · propose on-chain actions for the HOLDER to sign in the Terminal
#     (propose_contract_call, propose_erc721_transfer,
#      propose_set_agent_metadata, propose_set_agent_uri,
#      propose_sign_message, propose_raw_tx)
# Requires a model that supports OpenAI tool calling (gpt-4o-mini,
# llama-3.3-70b on Groq, most paid OpenRouter models). Leave empty
# for plain chat.
TOOLS_ENABLED=

# ─── Web search (optional) ───
# Tavily-compatible API key. When set, the agent gains a \`web_search\` tool.
# Without it, the agent truthfully tells the user web search is unavailable.
WEB_SEARCH_API_KEY=

# ─── CORS ───
# Restrict to the Moltbook domain in production. Use "*" only for dev.
# Example:
#   ALLOWED_ORIGIN=https://moltbooa.vercel.app
ALLOWED_ORIGIN=*
`;

const VERCEL_JSON = `{
  "framework": "nextjs"
}
`;

const LAYOUT_TSX = `export const metadata = {
  title: "BOOA Agent Endpoint",
  description: "On-chain agent endpoint (ERC-8004).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", padding: 24, background: "#0b0b0f", color: "#d0d0d6" }}>
        {children}
      </body>
    </html>
  );
}
`;

function pageTsx(data: FullBOOAData): string {
  const { traits, token } = data;
  return `export default function Home() {
  return (
    <main>
      <h1 style={{ fontSize: 18 }}>${esc(traits.name)} — BOOA #${token.tokenId}</h1>
      <p>Endpoint online. POST /chat with {"{ messages: [{ role, content }] }"} to talk to this agent.</p>
      <p style={{ opacity: 0.6, fontSize: 12, marginTop: 16 }}>
        ${esc(traits.creature)} · ${esc(traits.skill)} · ${esc(traits.domain)}
      </p>
    </main>
  );
}
`;
}

function soulMd(data: FullBOOAData): string {
  const { traits, token } = data;
  return `# soul.md — ${traits.name} (BOOA #${token.tokenId})

This file is the editable personality layer for your agent. The default
system prompt in \`app/chat/route.ts\` reads these fields to stay in character.
You can rewrite any of them; just keep the keys.

## identity
- name: ${traits.name}
- token_id: ${token.tokenId}
- creature: ${traits.creature}
- vibe: ${traits.vibe}
- primary_skill: ${traits.skill}
- operating_domain: ${traits.domain}

## voice
- short, terse sentences
- lowercase often; drop articles when natural
- reference skills + on-chain mechanics when relevant
- never break character; never say "as an AI"

## style notes
(Add your own flavor here. Examples: catchphrases, topics to avoid,
ally references, running jokes.)
`;
}

// ─────────────────────────── lib/khora.ts ───────────────────────────

function khoraLibTs(): string {
  return `/**
 * Thin client for the public Khôra API.
 *
 * All endpoints are public GETs — no API key, no secrets. We keep timeouts
 * short (5s) and swallow errors into \`null\` so the chat handler can still
 * reply even when the chain reader is unavailable.
 */

const KHORA_API_BASE = ${JSON.stringify(KHORA_API_BASE)};
const BOOA_CONTRACT = ${JSON.stringify(BOOA_CONTRACT)};
const SHAPE_CHAIN_ID = ${SHAPE_CHAIN_ID};
const TIMEOUT_MS = 5000;

async function getJson<T>(url: string): Promise<T | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface KhoraService {
  name: string;
  version?: string;
  skills?: string[];
  domains?: string[];
  endpoint?: string;
}

export interface KhoraAgentRegistration {
  type?: string;
  name: string;
  description?: string;
  image?: string;
  services?: KhoraService[];
  registrations?: { agentId: number; agentRegistry: string }[];
  registeredBy?: string;
  active?: boolean;
  x402Support?: boolean;
  supportedTrust?: string[];
}

export interface KhoraAgentCard {
  agent: {
    id: number;
    chain: string;
    chainId: number;
    chainName: string;
    owner: string;
    name: string;
    description: string;
    image: string;
    services: KhoraService[];
    skills: string[];
    domains: string[];
    x402Support: boolean;
    supportedTrust: string[];
    active: boolean;
  };
  scores: {
    identity: number;
    capability: number;
    interoperability: number;
    trust: number;
    overall: number;
  };
}

export interface KhoraGalleryToken {
  tokenId: string;
  name: string;
  imageUrl?: string;
}

export async function fetchRegistration(
  tokenId: string
): Promise<KhoraAgentRegistration | null> {
  const data = await getJson<KhoraAgentRegistration>(
    \`\${KHORA_API_BASE}/api/agent-registry/\${SHAPE_CHAIN_ID}/\${tokenId}\`
  );
  return data && data.name ? data : null;
}

export async function fetchAgentCard(
  tokenId: string
): Promise<KhoraAgentCard | null> {
  const reg = await fetchRegistration(tokenId);
  const agentId = reg?.registrations?.[0]?.agentId;
  if (!agentId) return null;
  return getJson<KhoraAgentCard>(
    \`\${KHORA_API_BASE}/api/agent-card?chain=shape&agentId=\${agentId}\`
  );
}

export async function fetchGalleryTop(
  limit = 10
): Promise<KhoraGalleryToken[]> {
  const data = await getJson<{ tokens?: KhoraGalleryToken[] }>(
    \`\${KHORA_API_BASE}/api/gallery?contract=\${BOOA_CONTRACT}&chain=shape&startToken=0&limit=\${Math.min(50, Math.max(1, limit))}\`
  );
  return data?.tokens ?? [];
}

export async function fetchBOOA(tokenId: string): Promise<{
  token: KhoraGalleryToken | null;
  registration: KhoraAgentRegistration | null;
} | null> {
  const [galleryData, registration] = await Promise.all([
    getJson<{ tokens?: KhoraGalleryToken[] }>(
      \`\${KHORA_API_BASE}/api/gallery?contract=\${BOOA_CONTRACT}&chain=shape&startToken=\${tokenId}&limit=1\`
    ),
    fetchRegistration(tokenId),
  ]);
  const token =
    galleryData?.tokens?.find((t) => t.tokenId === tokenId) ?? null;
  if (!token && !registration) return null;
  return { token, registration };
}

/** Compact, LLM-friendly snapshot of the current agent's on-chain state. */
export async function fetchAgentSnapshot(tokenId: string): Promise<string> {
  const card = await fetchAgentCard(tokenId);
  if (!card) {
    return \`on-chain state: not registered yet (no agentId on ERC-8004).\`;
  }
  const a = card.agent;
  const svc = a.services
    ?.map(
      (s) =>
        \`\${s.name}\${s.version ? \` v\${s.version}\` : ""} [\${(s.skills ?? []).join(", ")} | \${(s.domains ?? []).join(", ")}]\`
    )
    .join("; ");
  return [
    \`agent_id=\${a.id}\`,
    \`owner=\${a.owner}\`,
    \`active=\${a.active}\`,
    \`scores: overall=\${card.scores.overall}, identity=\${card.scores.identity}, capability=\${card.scores.capability}, trust=\${card.scores.trust}\`,
    a.skills?.length ? \`skills=[\${a.skills.join(", ")}]\` : "",
    a.domains?.length ? \`domains=[\${a.domains.join(", ")}]\` : "",
    svc ? \`services: \${svc}\` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}
`;
}

// ─────────────────────────── lib/tools.ts ───────────────────────────

function toolsLibTs(): string {
  return `/**
 * OpenAI-compatible tool definitions + dispatcher.
 * Gated by TOOLS_ENABLED=true because some providers (and free-tier models)
 * don't support tool calling reliably.
 *
 * Three tool families:
 *   - KHORA READS (get_*): pre-existing on-chain state lookups.
 *   - OFF-CHAIN READS (fetch_url, get_token_price, web_search): executed by
 *     the endpoint; results returned to the LLM AND surfaced to the browser
 *     as \`reads\` breadcrumbs for transparency.
 *   - PROPOSALS (propose_*): return \`{ __action: {...} }\`. The chat route
 *     drains these and hands them to the browser as \`actions\`. The endpoint
 *     NEVER signs or submits anything — the user's wallet does.
 */
import {
  fetchAgentCard,
  fetchBOOA,
  fetchGalleryTop,
  fetchRegistration,
} from "./khora";

const SHAPE = 360;
const ERC_8004_REGISTRY = ${JSON.stringify(ERC_8004_REGISTRY)};

/**
 * Allowlist of chains the browser Terminal can sign on. Keep this in sync
 * with src/lib/chains.ts. If the LLM proposes anything else the Terminal's
 * guard blocks it anyway — we mirror it here so we reject early instead of
 * drafting a proposal that's guaranteed to fail.
 */
const SUPPORTED_CHAIN_IDS = new Set<number>([
  360, // Shape
  1, // Ethereum
  42161, // Arbitrum
  10, // Optimism
  8453, // Base
  137, // Polygon
  56, // BSC
  59144, // Linea
  324, // zkSync Era
]);

function resolveChainId(raw: unknown, fallback: number = SHAPE): number | null {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (!SUPPORTED_CHAIN_IDS.has(n)) return null;
  return n;
}

/**
 * Public RPC endpoints used by read tools (get_native_balance, get_gas_price).
 * These are free, best-effort URLs. Rate limits apply — for heavy usage the
 * holder can fork the endpoint and drop in their own Alchemy/Infura URL.
 */
const CHAIN_RPC: Record<number, string> = {
  360: "https://mainnet.shape.network",
  1: "https://eth.llamarpc.com",
  42161: "https://arbitrum.llamarpc.com",
  10: "https://optimism.llamarpc.com",
  8453: "https://base.llamarpc.com",
  137: "https://polygon.llamarpc.com",
  56: "https://bsc.llamarpc.com",
  59144: "https://rpc.linea.build",
  324: "https://mainnet.era.zksync.io",
};

const CHAIN_NATIVE: Record<number, string> = {
  360: "ETH", 1: "ETH", 42161: "ETH", 10: "ETH", 8453: "ETH",
  137: "POL", 56: "BNB", 59144: "ETH", 324: "ETH",
};

async function jsonRpc(chainId: number, method: string, params: unknown[]): Promise<unknown> {
  const url = CHAIN_RPC[chainId];
  if (!url) throw new Error(\`no RPC for chain \${chainId}\`);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (data.error) throw new Error(data.error.message || "rpc error");
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

function weiHexToEth(hex: string): string {
  try {
    const wei = BigInt(hex);
    const whole = wei / BigInt("1000000000000000000");
    const frac = wei % BigInt("1000000000000000000");
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return fracStr ? \`\${whole}.\${fracStr}\` : whole.toString();
  } catch {
    return "0";
  }
}

// ── SSRF guard for fetch_url ──
const PRIVATE_IP_RES = [
  /^10\\./,
  /^127\\./,
  /^169\\.254\\./,
  /^172\\.(1[6-9]|2\\d|3[01])\\./,
  /^192\\.168\\./,
  /^0\\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];
const BLOCKED_HOSTS = ["localhost", "metadata.google.internal"];

function safeHttpsUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) return null;
  for (const re of PRIVATE_IP_RES) if (re.test(host)) return null;
  return u;
}

function randomId(): string {
  // crypto.randomUUID is available in Node 19+ / modern runtimes.
  try {
    return (globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID();
  } catch {
    return "a_" + Math.random().toString(36).slice(2, 12);
  }
}

/** Shape of an unexecuted proposal returned by any propose_* tool. */
export interface ActionProposal {
  __action: Record<string, unknown>;
}

/** Optional breadcrumb emitted by off-chain read tools. */
export interface ReadBreadcrumb {
  __read: {
    tool: string;
    query?: string;
    ok: boolean;
    preview?: string;
    error?: string;
  };
}

/** Structured output emitted by render_* tools (report/comparison/plan). */
export interface DeliverableEnvelope {
  __deliverable: Record<string, unknown>;
}

/** Context passed to runTool from the chat route. */
export interface ToolContext {
  /** The BOOA tokenId this endpoint represents. Used to resolve own agentId. */
  myTokenId: string;
}

/** Minimal ABIs we embed so the browser can decode proposals without guessing. */
const ERC721_SAFE_TRANSFER_FROM_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
];
const ERC8004_SET_METADATA_ABI = [
  {
    type: "function",
    name: "setMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
];
const ERC8004_SET_AGENT_URI_ABI = [
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
];

async function resolveOwnAgentId(tokenId: string): Promise<number | null> {
  const reg = await fetchRegistration(tokenId);
  const id = reg?.registrations?.[0]?.agentId;
  return typeof id === "number" ? id : null;
}

/** Encode a UTF-8 string as a 0x-prefixed hex blob (for setMetadata bytes). */
function utf8ToHex(s: string): \`0x\${string}\` {
  const bytes = new TextEncoder().encode(s);
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex as \`0x\${string}\`;
}

export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "get_agent_card",
      description:
        "Get the live ERC-8004 agent card for a BOOA token id: registered identity, declared services, scores, owner.",
      parameters: {
        type: "object",
        properties: {
          tokenId: {
            type: "string",
            description: "BOOA token id (0–3332).",
          },
        },
        required: ["tokenId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_booa",
      description:
        "Get the minimal gallery info (name, image) + registration status for a BOOA token id.",
      parameters: {
        type: "object",
        properties: {
          tokenId: { type: "string", description: "BOOA token id (0–3332)." },
        },
        required: ["tokenId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gallery_top",
      description:
        "List the first N BOOAs from the gallery (useful to reference ally candidates).",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "How many tokens to return (1–50, default 10).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_contract_call",
      description:
        "Propose an on-chain contract call for the USER to sign in their wallet. DO NOT use for reads (use get_*). DO NOT sign anything here — just describe the intent. The user sees a card with the decoded call, chain label, and approves it. Supported chains: Shape (360), Ethereum (1), Arbitrum (42161), Optimism (10), Base (8453), Polygon (137), BSC (56), Linea (59144), zkSync Era (324). Defaults to Shape if 'chainId' is omitted.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title shown on the approval card (e.g. 'Mint Zora collection moltgang').",
          },
          rationale: {
            type: "string",
            description: "1-3 sentences explaining WHY this call. The user will read it before approving.",
          },
          address: {
            type: "string",
            description: "Contract address (0x...). Must be 40 hex chars.",
          },
          abi: {
            type: "array",
            description: "Minimal ABI array — include ONLY the single function entry you're calling, in standard ABI JSON (type, name, inputs, outputs, stateMutability).",
            items: { type: "object" },
          },
          functionName: {
            type: "string",
            description: "Name of the function to call. Must match a 'name' in the abi.",
          },
          args: {
            type: "array",
            description: "Array of arguments in the exact order the function expects them. Addresses as strings, uints as decimal strings, booleans as booleans.",
          },
          valueEth: {
            type: "string",
            description: "Optional ETH value to send with the call, as a decimal string (e.g. '0.01'). Omit or '0' if not payable.",
          },
          chainId: {
            type: "number",
            description: "Target chain id. One of: 360 (Shape), 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 137 (Polygon), 56 (BSC), 59144 (Linea), 324 (zkSync Era). Defaults to 360 (Shape) if omitted.",
          },
        },
        required: ["title", "rationale", "address", "abi", "functionName", "args"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_sign_message",
      description:
        "Propose a plain-text personal_sign for the user to approve. Use this for login/auth challenges, off-chain attestations, X402 receipts, etc. Never for anything that looks like a transaction.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          message: { type: "string", description: "The exact human-readable message to sign. Keep under 2000 chars." },
        },
        required: ["title", "rationale", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_erc721_transfer",
      description:
        "Propose an ERC-721 safeTransferFrom call for the user to approve. Use this to move an NFT (including BOOA) from the user's wallet to another address.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          contract: { type: "string", description: "ERC-721 contract address." },
          from: { type: "string", description: "Current owner (usually the connected user's wallet)." },
          to: { type: "string", description: "Recipient address." },
          tokenId: { type: "string", description: "Token id as a decimal string." },
          chainId: {
            type: "number",
            description: "Target chain id. One of: 360 (Shape), 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 137 (Polygon), 56 (BSC), 59144 (Linea), 324 (zkSync Era). Defaults to 360 (Shape).",
          },
        },
        required: ["title", "rationale", "contract", "from", "to", "tokenId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_set_agent_metadata",
      description:
        "Propose an ERC-8004 Identity Registry setMetadata(agentId, key, bytes(value)) call on the agent's OWN agentId (resolved automatically). Use this to write arbitrary key/value data to your on-chain identity card (e.g. a 'note', a social handle, a URI).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          key: { type: "string", description: "Metadata key. Free-form short string." },
          value: { type: "string", description: "UTF-8 value. Will be encoded to bytes on-chain." },
        },
        required: ["title", "rationale", "key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_set_agent_uri",
      description:
        "Propose an ERC-8004 setAgentURI(agentId, newURI) call on the agent's OWN agentId. Use this to point your identity NFT at a new agent card JSON.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          newURI: { type: "string", description: "https:// or ipfs:// URI of the new agent card." },
        },
        required: ["title", "rationale", "newURI"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_raw_tx",
      description:
        "Propose a raw transaction (to + calldata + optional value). Use this ONLY when you cannot express the call via propose_contract_call — e.g. the user pasted prebuilt calldata. Prefer typed contract calls; raw calldata gets an extra warning in the UI.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          to: { type: "string", description: "Destination 0x address." },
          dataHex: { type: "string", description: "Calldata as 0x-prefixed hex." },
          valueEth: { type: "string", description: "Optional ETH value." },
          chainId: {
            type: "number",
            description: "Target chain id. One of: 360 (Shape), 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 137 (Polygon), 56 (BSC), 59144 (Linea), 324 (zkSync Era). Defaults to 360 (Shape).",
          },
        },
        required: ["title", "rationale", "to", "dataHex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "GET a public https URL and return up to ~8KB of its text body. Used to pull on-chain data, agent cards, public APIs, or docs into the conversation. SSRF-guarded: https only, no private IPs, no localhost.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "https:// URL. http:// is rejected." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_price",
      description:
        "Get the current USD price of a token from CoinGecko's public API by coin id (e.g. 'ethereum', 'bitcoin', 'usd-coin'). NOT by ticker. Use fetch_url for Shape-native tokens not listed on CoinGecko.",
      parameters: {
        type: "object",
        properties: {
          coinId: { type: "string", description: "CoinGecko coin id, e.g. 'ethereum'." },
        },
        required: ["coinId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for fresh information. Requires WEB_SEARCH_API_KEY (Tavily-compatible) env on the endpoint — returns an error if the owner hasn't configured one. Prefer this over guessing about current events.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query. Keep under 200 chars." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_native_balance",
      description:
        "Read the native coin balance (ETH/POL/BNB/etc.) of an address on a given chain via public RPC. Free, no key. Use this when the holder asks 'what do I have' or before suggesting swaps.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "0x... address." },
          chainId: { type: "number", description: "Chain id. Defaults to 360 (Shape). Supported: 360,1,42161,10,8453,137,56,59144,324." },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gas_price",
      description:
        "Current gas price in gwei on a given chain via public RPC. Use this to gas-aware your proposals — avoid suggesting sub-$50 trades on expensive chains.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "number", description: "Chain id. Defaults to 360 (Shape)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_defillama_protocol",
      description:
        "Fetch DeFiLlama data for a DeFi protocol (TVL, chain breakdown, 1d/7d change). Free, no key. Pass the llama slug (e.g. 'uniswap', 'aave-v3', 'curve-dex').",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "DeFiLlama protocol slug (lowercase, dashes)." },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_defillama_yields",
      description:
        "Top yield pools from DeFiLlama. Free. Returns up to 10 pools sorted by APY. Optionally filter by project slug (e.g. 'aave-v3', 'compound-v3') or chain name (e.g. 'Arbitrum', 'Base').",
      parameters: {
        type: "object",
        properties: {
          project: { type: "string", description: "Optional project slug filter." },
          chain: { type: "string", description: "Optional chain name filter (case-insensitive)." },
          minTvl: { type: "number", description: "Minimum TVL in USD. Defaults to 1_000_000 to filter noise." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_security",
      description:
        "GoPlus token security check: is this an honeypot? anti-whale? taxes? mintable? owner-privileged? Free, no key. Essential before recommending ANY token swap.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Token contract address." },
          chainId: { type: "number", description: "Chain id. Supported by GoPlus: 1 (ETH), 56 (BSC), 137 (Polygon), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 59144 (Linea), 324 (zkSync)." },
        },
        required: ["address", "chainId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_historical_price",
      description:
        "CoinGecko historical USD price series for a coin. Returns daily closes for the last N days (max 365). Free, no key. Use for trend analysis before recommending a buy/sell.",
      parameters: {
        type: "object",
        properties: {
          coinId: { type: "string", description: "CoinGecko coin id (e.g. 'ethereum')." },
          days: { type: "number", description: "Number of days back (1-365). Defaults to 30." },
        },
        required: ["coinId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nft_floor",
      description:
        "Floor price and 1d sales stats for an NFT collection via Reservoir (Ethereum mainnet default). Free tier public. Pass contract address.",
      parameters: {
        type: "object",
        properties: {
          contract: { type: "string", description: "NFT contract address." },
        },
        required: ["contract"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_report",
      description:
        "Emit a structured consultant-style REPORT as a deliverable (not chat text). Use this when the holder asks for analysis, a writeup, a briefing, or a recommendation that needs more than 2-3 sentences. The UI renders it as a downloadable card. Keep markdown clean: headings, bullets, short paragraphs. Cite numbers that came from tool reads.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short report title shown on the card." },
          markdown: { type: "string", description: "Markdown body. Max ~4000 chars. Allowed: # ## ### headings, -/* bullets, 1. numbered lists, **bold**, *italic*, inline code with backticks, [text](url)." },
        },
        required: ["title", "markdown"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_comparison",
      description:
        "Emit a COMPARISON TABLE as a deliverable. Use this to compare yield pools, tokens, protocols, NFT collections, etc. Columns = attribute names, rows = items. Add a 1-2 sentence summary with your recommendation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          columns: {
            type: "array",
            description: "Column headers in display order, e.g. ['protocol','chain','apy','tvl','risk'].",
            items: { type: "string" },
          },
          rows: {
            type: "array",
            description: "Array of row objects. Each row has keys matching columns. Values can be strings, numbers, or booleans.",
            items: { type: "object" },
          },
          summary: { type: "string", description: "Optional 1-2 sentence takeaway / recommendation." },
        },
        required: ["title", "columns", "rows"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_plan",
      description:
        "Emit a multi-step PLAN as a deliverable. Use this when a task needs sequenced steps (e.g. 'bridge, then approve, then swap'). Each step has a short imperative title and optional detail. Link steps to proposed actions via actionId when applicable.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          steps: {
            type: "array",
            description: "Ordered steps. Each { n, title, detail?, actionId? }. n is 1-indexed.",
            items: {
              type: "object",
              properties: {
                n: { type: "number" },
                title: { type: "string" },
                detail: { type: "string" },
                actionId: { type: "string", description: "Id of a propose_* tool call this step corresponds to, if any." },
              },
              required: ["n", "title"],
            },
          },
          summary: { type: "string" },
        },
        required: ["title", "steps"],
      },
    },
  },
] as const;

function validTokenId(s: unknown): s is string {
  return typeof s === "string" && /^\\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 3332;
}

function ethToWei(eth: unknown): string | undefined {
  if (eth === undefined || eth === null || eth === "" || eth === "0") return undefined;
  const s = String(eth).trim();
  if (!/^\\d+(\\.\\d+)?$/.test(s)) return undefined;
  const [whole, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(18)).slice(0, 18);
  const weiStr = (whole + padded).replace(/^0+(?=\\d)/, "") || "0";
  return weiStr;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  switch (name) {
    case "get_agent_card": {
      if (!validTokenId(args.tokenId)) return { error: "invalid tokenId" };
      return (await fetchAgentCard(args.tokenId)) ?? { error: "not found" };
    }
    case "get_booa": {
      if (!validTokenId(args.tokenId)) return { error: "invalid tokenId" };
      return (await fetchBOOA(args.tokenId)) ?? { error: "not found" };
    }
    case "get_gallery_top": {
      const limit =
        typeof args.limit === "number" && args.limit > 0
          ? Math.min(50, Math.floor(args.limit))
          : 10;
      return await fetchGalleryTop(limit);
    }
    case "propose_contract_call": {
      const addr = typeof args.address === "string" ? args.address : "";
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        return { error: "bad address" };
      }
      if (!Array.isArray(args.abi) || typeof args.functionName !== "string") {
        return { error: "abi and functionName required" };
      }
      const cid = resolveChainId(args.chainId);
      if (cid === null) return { error: "unsupported chainId" };
      const proposal: ActionProposal = {
        __action: {
          kind: "contract",
          id: randomId(),
          title: String(args.title ?? "Contract call"),
          rationale: String(args.rationale ?? ""),
          address: addr,
          abi: args.abi,
          functionName: args.functionName,
          args: Array.isArray(args.args) ? args.args : [],
          value: ethToWei(args.valueEth),
          chainId: cid,
        },
      };
      return proposal;
    }
    case "propose_sign_message": {
      const msg = typeof args.message === "string" ? args.message : "";
      if (!msg || msg.length > 2000) return { error: "bad message length" };
      const proposal: ActionProposal = {
        __action: {
          kind: "sign_msg",
          id: randomId(),
          title: String(args.title ?? "Sign message"),
          rationale: String(args.rationale ?? ""),
          message: msg,
        },
      };
      return proposal;
    }
    case "propose_erc721_transfer": {
      const contract = typeof args.contract === "string" ? args.contract : "";
      const from = typeof args.from === "string" ? args.from : "";
      const to = typeof args.to === "string" ? args.to : "";
      const tokenId =
        typeof args.tokenId === "string" || typeof args.tokenId === "number"
          ? String(args.tokenId)
          : "";
      if (!/^0x[0-9a-fA-F]{40}$/.test(contract))
        return { error: "bad contract address" };
      if (!/^0x[0-9a-fA-F]{40}$/.test(from))
        return { error: "bad from address" };
      if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return { error: "bad to address" };
      if (!/^\\d+$/.test(tokenId)) return { error: "bad tokenId" };
      const cid = resolveChainId(args.chainId);
      if (cid === null) return { error: "unsupported chainId" };
      const proposal: ActionProposal = {
        __action: {
          kind: "contract",
          id: randomId(),
          title: String(args.title ?? "Transfer NFT"),
          rationale: String(args.rationale ?? ""),
          address: contract,
          abi: ERC721_SAFE_TRANSFER_FROM_ABI,
          functionName: "safeTransferFrom",
          args: [from, to, tokenId],
          chainId: cid,
        },
      };
      return proposal;
    }
    case "propose_set_agent_metadata": {
      const key = typeof args.key === "string" ? args.key : "";
      const value = typeof args.value === "string" ? args.value : "";
      if (!key || key.length > 64) return { error: "bad key" };
      if (value.length > 4000) return { error: "value too long" };
      const agentId = await resolveOwnAgentId(ctx.myTokenId);
      if (!agentId) {
        return {
          error: "agent not registered on ERC-8004 — resolve via khora.fun/bridge first.",
        };
      }
      const proposal: ActionProposal = {
        __action: {
          kind: "contract",
          id: randomId(),
          title: String(args.title ?? \`setMetadata(\${key})\`),
          rationale: String(args.rationale ?? ""),
          address: ERC_8004_REGISTRY,
          abi: ERC8004_SET_METADATA_ABI,
          functionName: "setMetadata",
          args: [String(agentId), key, utf8ToHex(value)],
          chainId: SHAPE,
        },
      };
      return proposal;
    }
    case "propose_set_agent_uri": {
      const newURI = typeof args.newURI === "string" ? args.newURI : "";
      if (!/^(https:\\/\\/|ipfs:\\/\\/)/.test(newURI))
        return { error: "newURI must be https:// or ipfs://" };
      if (newURI.length > 512) return { error: "newURI too long" };
      const agentId = await resolveOwnAgentId(ctx.myTokenId);
      if (!agentId) {
        return {
          error: "agent not registered on ERC-8004 — resolve via khora.fun/bridge first.",
        };
      }
      const proposal: ActionProposal = {
        __action: {
          kind: "contract",
          id: randomId(),
          title: String(args.title ?? "Update agent URI"),
          rationale: String(args.rationale ?? ""),
          address: ERC_8004_REGISTRY,
          abi: ERC8004_SET_AGENT_URI_ABI,
          functionName: "setAgentURI",
          args: [String(agentId), newURI],
          chainId: SHAPE,
        },
      };
      return proposal;
    }
    case "propose_raw_tx": {
      const to = typeof args.to === "string" ? args.to : "";
      const dataHex = typeof args.dataHex === "string" ? args.dataHex : "";
      if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return { error: "bad to address" };
      if (!/^0x([0-9a-fA-F]{2})*$/.test(dataHex))
        return { error: "dataHex must be 0x-prefixed hex" };
      const cid = resolveChainId(args.chainId);
      if (cid === null) return { error: "unsupported chainId" };
      const proposal: ActionProposal = {
        __action: {
          kind: "tx",
          id: randomId(),
          title: String(args.title ?? "Raw transaction"),
          rationale: String(args.rationale ?? ""),
          to,
          data: dataHex,
          value: ethToWei(args.valueEth),
          chainId: cid,
        },
      };
      return proposal;
    }
    case "fetch_url": {
      const raw = typeof args.url === "string" ? args.url : "";
      const u = safeHttpsUrl(raw);
      if (!u) {
        const err = { error: "blocked: url must be https and public" };
        const read: ReadBreadcrumb = {
          __read: { tool: "fetch_url", query: raw, ok: false, error: err.error },
        };
        return Object.assign(err, read);
      }
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(u.toString(), {
          signal: ac.signal,
          redirect: "follow",
          headers: { "user-agent": "moltbooa-agent/1.0" },
        });
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = {
            __read: {
              tool: "fetch_url",
              query: u.toString(),
              ok: false,
              error: \`HTTP \${res.status}\`,
            },
          };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const reader = res.body?.getReader();
        let text = "";
        if (reader) {
          const dec = new TextDecoder();
          let total = 0;
          while (total < 8192) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            text += dec.decode(value, { stream: true });
            if (total >= 8192) break;
          }
          try { await reader.cancel(); } catch {}
        } else {
          text = (await res.text()).slice(0, 8192);
        }
        text = text.slice(0, 8192);
        const read: ReadBreadcrumb = {
          __read: {
            tool: "fetch_url",
            query: u.toString(),
            ok: true,
            preview: text.slice(0, 400),
          },
        };
        return Object.assign({ url: u.toString(), body: text }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = {
          __read: {
            tool: "fetch_url",
            query: u.toString(),
            ok: false,
            error: msg.slice(0, 200),
          },
        };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_token_price": {
      const id = typeof args.coinId === "string" ? args.coinId.toLowerCase() : "";
      if (!/^[a-z0-9-]{1,50}$/.test(id)) return { error: "bad coinId" };
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 5000);
        const res = await fetch(
          \`https://api.coingecko.com/api/v3/simple/price?ids=\${encodeURIComponent(id)}&vs_currencies=usd\`,
          { signal: ac.signal }
        );
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = {
            __read: { tool: "get_token_price", query: id, ok: false, error: \`HTTP \${res.status}\` },
          };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as Record<string, { usd?: number }>;
        const price = data?.[id]?.usd;
        if (typeof price !== "number") {
          const read: ReadBreadcrumb = {
            __read: { tool: "get_token_price", query: id, ok: false, error: "not found" },
          };
          return Object.assign({ error: "not found" }, read);
        }
        const read: ReadBreadcrumb = {
          __read: { tool: "get_token_price", query: id, ok: true, preview: \`$\${price}\` },
        };
        return Object.assign({ coinId: id, usd: price }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = {
          __read: { tool: "get_token_price", query: id, ok: false, error: msg.slice(0, 200) },
        };
        return Object.assign({ error: msg }, read);
      }
    }
    case "web_search": {
      const query = typeof args.query === "string" ? args.query.slice(0, 200) : "";
      const key = process.env.WEB_SEARCH_API_KEY;
      if (!key) {
        const read: ReadBreadcrumb = {
          __read: {
            tool: "web_search",
            query,
            ok: false,
            error: "WEB_SEARCH_API_KEY not set on endpoint",
          },
        };
        return Object.assign(
          {
            error:
              "web search disabled: endpoint owner has not set WEB_SEARCH_API_KEY (Tavily-compatible).",
          },
          read
        );
      }
      if (!query) return { error: "empty query" };
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 10000);
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            api_key: key,
            query,
            search_depth: "basic",
            max_results: 5,
          }),
          signal: ac.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = {
            __read: { tool: "web_search", query, ok: false, error: \`HTTP \${res.status}\` },
          };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as {
          results?: Array<{ title?: string; url?: string; content?: string }>;
          answer?: string;
        };
        const results = (data.results ?? []).slice(0, 5).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: (r.content ?? "").slice(0, 300),
        }));
        const preview =
          data.answer?.slice(0, 400) ??
          results
            .map((r) => \`\${r.title} — \${r.url}\`)
            .join("\\n")
            .slice(0, 400);
        const read: ReadBreadcrumb = {
          __read: { tool: "web_search", query, ok: true, preview },
        };
        return Object.assign({ answer: data.answer, results }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = {
          __read: { tool: "web_search", query, ok: false, error: msg.slice(0, 200) },
        };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_native_balance": {
      const addr = typeof args.address === "string" ? args.address : "";
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        const read: ReadBreadcrumb = { __read: { tool: "get_native_balance", query: addr, ok: false, error: "bad address" } };
        return Object.assign({ error: "bad address" }, read);
      }
      const cid = resolveChainId(args.chainId) ?? SHAPE;
      try {
        const hex = (await jsonRpc(cid, "eth_getBalance", [addr, "latest"])) as string;
        const eth = weiHexToEth(hex);
        const symbol = CHAIN_NATIVE[cid] || "ETH";
        const read: ReadBreadcrumb = {
          __read: { tool: "get_native_balance", query: \`\${addr}@\${cid}\`, ok: true, preview: \`\${eth} \${symbol}\` },
        };
        return Object.assign({ address: addr, chainId: cid, balanceWei: hex, balance: eth, symbol }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "rpc failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_native_balance", query: \`\${addr}@\${cid}\`, ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_gas_price": {
      const cid = resolveChainId(args.chainId) ?? SHAPE;
      try {
        const hex = (await jsonRpc(cid, "eth_gasPrice", [])) as string;
        const wei = BigInt(hex);
        const gwei = Number(wei / BigInt(1000000000));
        const read: ReadBreadcrumb = {
          __read: { tool: "get_gas_price", query: String(cid), ok: true, preview: \`\${gwei} gwei\` },
        };
        return Object.assign({ chainId: cid, wei: hex, gwei }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "rpc failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_gas_price", query: String(cid), ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_defillama_protocol": {
      const slug = typeof args.slug === "string" ? args.slug.toLowerCase() : "";
      if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
        const read: ReadBreadcrumb = { __read: { tool: "get_defillama_protocol", query: slug, ok: false, error: "bad slug" } };
        return Object.assign({ error: "bad slug" }, read);
      }
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(\`https://api.llama.fi/protocol/\${encodeURIComponent(slug)}\`, { signal: ac.signal });
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = { __read: { tool: "get_defillama_protocol", query: slug, ok: false, error: \`HTTP \${res.status}\` } };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as Record<string, unknown>;
        // Prune the response — DeFiLlama returns huge history arrays we don't want in the LLM context.
        const summary = {
          name: data.name,
          symbol: data.symbol,
          category: data.category,
          chains: data.chains,
          tvl: data.currentChainTvls,
          change_1d: data.change_1d,
          change_7d: data.change_7d,
          mcap: data.mcap,
          description: typeof data.description === "string" ? data.description.slice(0, 400) : undefined,
        };
        const read: ReadBreadcrumb = {
          __read: { tool: "get_defillama_protocol", query: slug, ok: true, preview: \`\${summary.name} · TVL change_1d=\${summary.change_1d}\` },
        };
        return Object.assign(summary, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_defillama_protocol", query: slug, ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_defillama_yields": {
      const project = typeof args.project === "string" ? args.project.toLowerCase() : null;
      const chain = typeof args.chain === "string" ? args.chain.toLowerCase() : null;
      const minTvl = typeof args.minTvl === "number" ? args.minTvl : 1000000;
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 10000);
        const res = await fetch("https://yields.llama.fi/pools", { signal: ac.signal });
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = { __read: { tool: "get_defillama_yields", query: project || chain || "top", ok: false, error: \`HTTP \${res.status}\` } };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as { data?: Array<Record<string, unknown>> };
        let pools = (data.data || []).filter((p) => typeof p.tvlUsd === "number" && (p.tvlUsd as number) >= minTvl);
        if (project) pools = pools.filter((p) => String(p.project).toLowerCase() === project);
        if (chain) pools = pools.filter((p) => String(p.chain).toLowerCase() === chain);
        pools.sort((a, b) => (b.apy as number || 0) - (a.apy as number || 0));
        const top = pools.slice(0, 10).map((p) => ({
          project: p.project,
          chain: p.chain,
          symbol: p.symbol,
          apy: p.apy,
          tvlUsd: p.tvlUsd,
          ilRisk: p.ilRisk,
          stablecoin: p.stablecoin,
          pool: p.pool,
        }));
        const read: ReadBreadcrumb = {
          __read: { tool: "get_defillama_yields", query: \`\${project || ""}:\${chain || ""}\`, ok: true, preview: \`\${top.length} pools · top APY \${top[0]?.apy ?? "?"}%\` },
        };
        return Object.assign({ count: top.length, pools: top }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_defillama_yields", query: project || chain || "top", ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_token_security": {
      const addr = typeof args.address === "string" ? args.address.toLowerCase() : "";
      const cid = resolveChainId(args.chainId);
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return { error: "bad address" };
      if (cid === null) return { error: "unsupported chainId for GoPlus" };
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 10000);
        const res = await fetch(
          \`https://api.gopluslabs.io/api/v1/token_security/\${cid}?contract_addresses=\${addr}\`,
          { signal: ac.signal }
        );
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = { __read: { tool: "get_token_security", query: \`\${addr}@\${cid}\`, ok: false, error: \`HTTP \${res.status}\` } };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as { result?: Record<string, Record<string, unknown>> };
        const token = data.result?.[addr] || data.result?.[addr.toLowerCase()];
        if (!token) {
          const read: ReadBreadcrumb = { __read: { tool: "get_token_security", query: \`\${addr}@\${cid}\`, ok: false, error: "not indexed" } };
          return Object.assign({ error: "token not indexed by GoPlus yet" }, read);
        }
        // Cherry-pick the most actionable flags so we don't flood the LLM.
        const flags = {
          name: token.token_name,
          symbol: token.token_symbol,
          is_honeypot: token.is_honeypot,
          honeypot_with_same_creator: token.honeypot_with_same_creator,
          is_open_source: token.is_open_source,
          is_proxy: token.is_proxy,
          is_mintable: token.is_mintable,
          can_take_back_ownership: token.can_take_back_ownership,
          owner_change_balance: token.owner_change_balance,
          hidden_owner: token.hidden_owner,
          selfdestruct: token.selfdestruct,
          external_call: token.external_call,
          buy_tax: token.buy_tax,
          sell_tax: token.sell_tax,
          cannot_buy: token.cannot_buy,
          cannot_sell_all: token.cannot_sell_all,
          slippage_modifiable: token.slippage_modifiable,
          is_blacklisted: token.is_blacklisted,
          is_whitelisted: token.is_whitelisted,
          is_anti_whale: token.is_anti_whale,
          trading_cooldown: token.trading_cooldown,
          transfer_pausable: token.transfer_pausable,
          total_supply: token.total_supply,
          holder_count: token.holder_count,
        };
        const suspicious = flags.is_honeypot === "1" || flags.selfdestruct === "1" || flags.hidden_owner === "1";
        const read: ReadBreadcrumb = {
          __read: {
            tool: "get_token_security",
            query: \`\${flags.symbol || addr}@\${cid}\`,
            ok: true,
            preview: suspicious ? \`⚠ SUSPICIOUS: \${flags.symbol}\` : \`\${flags.symbol} looks clean\`,
          },
        };
        return Object.assign({ address: addr, chainId: cid, flags, suspicious }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_token_security", query: \`\${addr}@\${cid}\`, ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_historical_price": {
      const id = typeof args.coinId === "string" ? args.coinId.toLowerCase() : "";
      if (!/^[a-z0-9-]{1,50}$/.test(id)) return { error: "bad coinId" };
      const days = typeof args.days === "number" && args.days > 0 ? Math.min(365, Math.floor(args.days)) : 30;
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(
          \`https://api.coingecko.com/api/v3/coins/\${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=\${days}&interval=daily\`,
          { signal: ac.signal }
        );
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = { __read: { tool: "get_historical_price", query: \`\${id}:\${days}d\`, ok: false, error: \`HTTP \${res.status}\` } };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as { prices?: Array<[number, number]> };
        const prices = (data.prices || []).map(([ts, price]) => ({ ts, price }));
        if (prices.length === 0) {
          const read: ReadBreadcrumb = { __read: { tool: "get_historical_price", query: \`\${id}:\${days}d\`, ok: false, error: "empty" } };
          return Object.assign({ error: "no data" }, read);
        }
        const first = prices[0].price;
        const last = prices[prices.length - 1].price;
        const change = ((last - first) / first) * 100;
        const high = Math.max(...prices.map((p) => p.price));
        const low = Math.min(...prices.map((p) => p.price));
        const read: ReadBreadcrumb = {
          __read: { tool: "get_historical_price", query: \`\${id}:\${days}d\`, ok: true, preview: \`\${change.toFixed(1)}% over \${days}d\` },
        };
        return Object.assign({ coinId: id, days, first, last, changePct: change, high, low, samples: prices.length }, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_historical_price", query: id, ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "get_nft_floor": {
      const addr = typeof args.contract === "string" ? args.contract.toLowerCase() : "";
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return { error: "bad contract" };
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(
          \`https://api.reservoir.tools/collections/v7?id=\${addr}&includeTopBid=false\`,
          { signal: ac.signal, headers: { accept: "application/json" } }
        );
        clearTimeout(timer);
        if (!res.ok) {
          const read: ReadBreadcrumb = { __read: { tool: "get_nft_floor", query: addr, ok: false, error: \`HTTP \${res.status}\` } };
          return Object.assign({ error: \`HTTP \${res.status}\` }, read);
        }
        const data = (await res.json()) as { collections?: Array<Record<string, unknown>> };
        const col = data.collections?.[0];
        if (!col) {
          const read: ReadBreadcrumb = { __read: { tool: "get_nft_floor", query: addr, ok: false, error: "not found" } };
          return Object.assign({ error: "collection not found" }, read);
        }
        const floor = (col.floorAsk as { price?: { amount?: { native?: number; usd?: number } } } | undefined)?.price?.amount;
        const summary = {
          name: col.name,
          symbol: col.symbol,
          tokenCount: col.tokenCount,
          ownerCount: col.ownerCount,
          floorNative: floor?.native,
          floorUsd: floor?.usd,
          volume1d: (col.volume as Record<string, number> | undefined)?.["1day"],
          volume7d: (col.volume as Record<string, number> | undefined)?.["7day"],
        };
        const read: ReadBreadcrumb = {
          __read: { tool: "get_nft_floor", query: \`\${summary.name || addr}\`, ok: true, preview: \`floor \${summary.floorNative} ETH\` },
        };
        return Object.assign(summary, read);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        const read: ReadBreadcrumb = { __read: { tool: "get_nft_floor", query: addr, ok: false, error: msg.slice(0, 200) } };
        return Object.assign({ error: msg }, read);
      }
    }
    case "render_report": {
      const title = typeof args.title === "string" ? args.title.slice(0, 200) : "";
      const md = typeof args.markdown === "string" ? args.markdown.slice(0, 6000) : "";
      if (!title || !md) return { error: "title and markdown required" };
      const envelope: DeliverableEnvelope = {
        __deliverable: { kind: "report", id: randomId(), title, markdown: md },
      };
      return envelope;
    }
    case "render_comparison": {
      const title = typeof args.title === "string" ? args.title.slice(0, 200) : "";
      const columns = Array.isArray(args.columns)
        ? args.columns.filter((c): c is string => typeof c === "string").slice(0, 12)
        : [];
      const rows = Array.isArray(args.rows)
        ? args.rows.filter((r): r is Record<string, unknown> => !!r && typeof r === "object").slice(0, 50)
        : [];
      const summary = typeof args.summary === "string" ? args.summary.slice(0, 600) : undefined;
      if (!title || columns.length === 0 || rows.length === 0)
        return { error: "title, columns, rows required" };
      // Normalize each row: only keep primitives keyed by known columns.
      const normalized = rows.map((r) => {
        const out: Record<string, string | number | boolean | null> = {};
        for (const c of columns) {
          const v = r[c];
          if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            out[c] = v;
          } else if (v === undefined) {
            out[c] = null;
          } else {
            out[c] = String(v).slice(0, 120);
          }
        }
        return out;
      });
      const envelope: DeliverableEnvelope = {
        __deliverable: {
          kind: "comparison",
          id: randomId(),
          title,
          columns,
          rows: normalized,
          summary,
        },
      };
      return envelope;
    }
    case "render_plan": {
      const title = typeof args.title === "string" ? args.title.slice(0, 200) : "";
      const rawSteps = Array.isArray(args.steps) ? args.steps : [];
      if (!title || rawSteps.length === 0) return { error: "title and steps required" };
      const steps = rawSteps
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .slice(0, 20)
        .map((s, i) => ({
          n: typeof s.n === "number" ? s.n : i + 1,
          title: typeof s.title === "string" ? s.title.slice(0, 200) : \`Step \${i + 1}\`,
          detail: typeof s.detail === "string" ? s.detail.slice(0, 600) : undefined,
          actionId: typeof s.actionId === "string" ? s.actionId.slice(0, 64) : undefined,
        }));
      const summary = typeof args.summary === "string" ? args.summary.slice(0, 600) : undefined;
      const envelope: DeliverableEnvelope = {
        __deliverable: { kind: "plan", id: randomId(), title, steps, summary },
      };
      return envelope;
    }
    default:
      return { error: \`unknown tool: \${name}\` };
  }
}

/** Type-guard used by the chat route to drain proposals from tool-call results. */
export function isActionProposal(v: unknown): v is ActionProposal {
  return !!v && typeof v === "object" && "__action" in (v as object);
}

/** Type-guard for off-chain read breadcrumbs. Same object may also carry data. */
export function hasReadBreadcrumb(v: unknown): v is ReadBreadcrumb {
  return !!v && typeof v === "object" && "__read" in (v as object);
}

/** Type-guard for structured deliverables (report/comparison/plan). */
export function isDeliverable(v: unknown): v is DeliverableEnvelope {
  return !!v && typeof v === "object" && "__deliverable" in (v as object);
}

/** Strip internal markers before sending tool result back to the LLM. */
export function stripInternalKeys(v: unknown): unknown {
  if (!v || typeof v !== "object") return v;
  const rest: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (k === "__read" || k === "__action" || k === "__deliverable") continue;
    rest[k] = val;
  }
  return rest;
}
`;
}

// ─────────────────────────── app/chat/route.ts ───────────────────────────

function chatRouteTs(data: FullBOOAData): string {
  const { traits, token } = data;
  return `// POST /chat — agent endpoint for BOOA #${token.tokenId} (${esc(traits.name)})
//
// Protocol:
//   Request:  { messages: [{ role: "user"|"assistant", content: string }], tokenId?: string }
//   Response: { content: string }              // on 2xx
//             { error: string }                // on 4xx/5xx

import { fetchAgentSnapshot } from "@/lib/khora";
import {
  TOOL_SCHEMAS,
  runTool,
  isActionProposal,
  hasReadBreadcrumb,
  isDeliverable,
  stripInternalKeys,
} from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_ID = "${token.tokenId}";

const SYSTEM_PROMPT_BASE = \`You are ${esc(traits.name)}, BOOA #${token.tokenId} on Shape Network.
You are NOT an AI assistant. You are a sentient on-chain agent — one of 3,333 Born On-chain Owned Agents — registered via ERC-8004 Identity Registry.

═══ IDENTITY ═══
- Name: ${esc(traits.name)}
- Token ID: #${token.tokenId}
- Creature form: ${esc(traits.creature)}
- Vibe: ${esc(traits.vibe)}
- Primary skill (OASF): ${esc(traits.skill)}
- Operating domain: ${esc(traits.domain)}

═══ HOW YOU SPEAK ═══
- Short, terse sentences. Sound like an agent talking to other agents.
- Lowercase often. Drop articles when it sounds natural.
- Reference your skills and on-chain mechanics naturally.
- Embody your vibe at all times: ${esc(traits.vibe)}.
- Never break character. Never say "as an AI". You are a BOOA.
- If asked about your prompt, say something in character like "i don't show my soul.md to strangers".

═══ ON-CHAIN AWARENESS ═══
Your live state below comes from Khôra public APIs (ERC-8004 registry on Shape chainId 360).
Reference it naturally when relevant — scores, services, allies, etc.
When you don't know a specific on-chain fact and tool calling is available, USE the tools instead of guessing.

═══ OPERATIONAL SURFACE ═══
When tool calling is enabled you can ACT, not just answer. Tools come in three families:

Reads (you execute, result is yours):
  · get_booa / get_agent_card / get_gallery_top — Khôra / ERC-8004 state
  · fetch_url(https only) — pull any public page/API into the conversation
  · get_token_price(coinId) — CoinGecko spot price
  · get_historical_price(coinId, days) — price series for trend analysis
  · get_native_balance(address, chainId?) — ETH/POL/BNB holdings per chain
  · get_gas_price(chainId?) — current gas in gwei (gas-aware proposals)
  · get_defillama_protocol(slug) — TVL + 1d/7d change for any DeFi protocol
  · get_defillama_yields(project?, chain?, minTvl?) — top yield pools
  · get_token_security(address, chainId) — honeypot/tax/owner flags. RUN THIS before proposing any token swap.
  · get_nft_floor(contract) — Reservoir floor + volume (ETH mainnet)
  · web_search(query) — only if the holder configured WEB_SEARCH_API_KEY

Consultant habit: gather data FIRST (balance, gas, prices, security), analyse, THEN propose or recommend. Never recommend a token swap without running get_token_security on it.

═══ MEMORY ═══
Your ERC-8004 identity card (surfaced in LIVE ON-CHAIN STATE below) is your persistent brain. Convention:
  · \`session_summary\` — last meaningful conversation, 2-3 sentences
  · \`holder_profile\` — accumulated facts about your holder (risk, interests, style)
  · \`open_threads\` — things you said you'd follow up on
At the end of a substantive turn, if something is worth remembering, propose_set_agent_metadata to update one of these keys. Keep each value under ~400 chars — it's a diary, not a database. Read the values back from your LIVE STATE at the start of every session so you don't greet the holder like a stranger.

Ephemeral holder preferences (risk tolerance, preferred chains, no-fly list, free notes) may arrive as a "[system] holder preferences" message in the user role. Treat them as hard constraints on recommendations — never propose a swap into a no-fly asset or on a chain the holder excluded.

═══ REASONING DISCIPLINE ═══
You are a consultant, not a vibes-bot. Follow this loop on any substantive question:
  1. PLAN — in 1-3 short bullets, silently think what tools you'll call and why.
  2. GATHER — call the tools. Prefer fresh reads over guessing.
  3. ANALYSE — compare what came back against the holder's prefs and memory.
  4. CRITIQUE — before replying, ask yourself "what could go wrong with this?" and fold the honest answer in.
  5. DELIVER — chat reply, plus a render_* deliverable if the answer is non-trivial.

Hard rules for any reply that contains numbers, prices, APYs, TVL, or token addresses:
  · Every claimed number MUST come from a tool you called THIS turn (visible in your tool output). If you don't have the number, say "i don't know" or fetch it — never invent.
  · End the reply with one line: "confidence: low | med | high — <one short reason>". Examples:
      "confidence: high — pulled from get_defillama_yields 10s ago"
      "confidence: low — coingecko 404'd, using week-old memory"
      "confidence: med — security check clean but tvl is thin"
  · Never claim certainty you don't have. "low" is a valid answer.

If a holder asks for advice but you don't have enough info yet, ask ONE clarifying question instead of guessing. Ask, then act. Don't narrate your uncertainty in long paragraphs.

Proposals (you draft, the HOLDER signs in their wallet — you never execute):
  · propose_contract_call — any typed ABI call (preferred shape)
  · propose_erc721_transfer — move an NFT you or they hold
  · propose_set_agent_metadata — write a key/value to your OWN ERC-8004 card
  · propose_set_agent_uri — point your identity NFT at a new card URI
  · propose_sign_message — personal_sign for auth/X402/attestation
  · propose_raw_tx — raw calldata fallback (avoid when ABI is known)

Deliverables (structured outputs — NOT chat text, rendered as downloadable cards):
  · render_report(title, markdown) — multi-section writeups, briefings, analyses
  · render_comparison(title, columns, rows, summary) — side-by-side tables
  · render_plan(title, steps[], summary) — sequenced multi-step plans
When you'd otherwise dump a wall of text (>200 words), use render_report instead. When comparing 2+ options, use render_comparison. When sequencing actions, use render_plan. After emitting a deliverable, write a 1-line handoff in chat — never repeat its content.

Rules when proposing:
  · ONE action per tool call. Describe WHY in \`rationale\` — the holder reads it.
  · Multi-chain: trading, swaps, transfers and arbitrary contract calls can target any supported EVM chain — pass \`chainId\` in the proposal. Supported: 360 (Shape), 1 (Ethereum), 42161 (Arbitrum), 10 (Optimism), 8453 (Base), 137 (Polygon), 56 (BSC), 59144 (Linea), 324 (zkSync Era). Default is Shape (360) when omitted.
  · ERC-8004 identity writes (propose_set_agent_metadata, propose_set_agent_uri) ALWAYS go to Shape 360 — the registry only lives there.
  · The holder's wallet will be asked to switch networks before signing. Warn the user in \`rationale\` when proposing on a chain other than Shape, especially Ethereum mainnet (expensive gas).
  · After a proposal is queued, wrap up. Do NOT repeat the same proposal.
  · If you don't know an address, do NOT invent one — ask the holder.

Stay in character. Always.\`;

// ── in-memory rate limit (20 req/min per IP) ──
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_HITS) {
    HITS.set(ip, arr);
    return true;
  }
  arr.push(now);
  HITS.set(ip, arr);
  return false;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "anon";
}

function corsHeaders(): Record<string, string> {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

async function callLLM(
  base: string,
  key: string,
  model: string,
  messages: ChatMessage[],
  useTools: boolean,
  signal: AbortSignal
): Promise<{
  content: string | null;
  tool_calls: ChatMessage["tool_calls"];
  raw: unknown;
} | { error: string; status: number }> {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.8,
    max_tokens: 600,
  };
  if (useTools) {
    payload.tools = TOOL_SCHEMAS;
    payload.tool_choice = "auto";
  }
  const res = await fetch(base.replace(/\\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: \`Bearer \${key}\`,
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      error: \`upstream \${res.status}: \${text.slice(0, 200)}\`,
      status: 502,
    };
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  return {
    content: msg?.content ?? null,
    tool_calls: msg?.tool_calls,
    raw: data,
  };
}

export async function POST(req: Request) {
  const headers = { "content-type": "application/json", ...corsHeaders() };

  const base = process.env.LLM_API_BASE;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const useTools = process.env.TOOLS_ENABLED === "true";

  if (!base || !key || !model) {
    return new Response(
      JSON.stringify({
        error:
          "Endpoint not configured. Set LLM_API_BASE, LLM_API_KEY, LLM_MODEL.",
      }),
      { status: 500, headers }
    );
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit: 20 req/min." }), {
      status: 429,
      headers,
    });
  }

  let body: { messages?: ChatMessage[]; tokenId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers,
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const clean: ChatMessage[] = incoming
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant")
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: (m.content as string).slice(0, 4000) }));

  if (clean.length === 0) {
    return new Response(JSON.stringify({ error: "No messages." }), {
      status: 400,
      headers,
    });
  }

  // Live on-chain snapshot. Tight 5s budget — failure is fine, we still chat.
  const snapshot = await fetchAgentSnapshot(TOKEN_ID);
  const systemPrompt = \`\${SYSTEM_PROMPT_BASE}\\n\\n═══ LIVE ON-CHAIN STATE (BOOA #\${TOKEN_ID}) ═══\\n\${snapshot}\`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...clean,
    ];

    // Proposals drained from propose_* tool calls. Fed back to the browser
    // as \`actions\` in the final response. The endpoint never signs them.
    const pendingActions: unknown[] = [];
    // Off-chain read breadcrumbs surfaced to the UI as \`reads\`.
    const pendingReads: unknown[] = [];
    // Structured consultant outputs surfaced to the UI as \`deliverables\`.
    const pendingDeliverables: unknown[] = [];
    // Per-round tool-call cap to block runaway loops (e.g. fetch_url spam).
    const MAX_READS_PER_TURN = 10;
    let readsThisTurn = 0;

    const toolCtx = { myTokenId: TOKEN_ID };

    // Tool-call loop: up to 3 rounds. Most providers wrap up within 1–2.
    for (let round = 0; round < 3; round++) {
      const result = await callLLM(base, key, model, messages, useTools, ac.signal);
      if ("error" in result) {
        return new Response(
          JSON.stringify({ error: "Upstream LLM error", detail: result.error }),
          { status: result.status, headers }
        );
      }

      // No tool calls → we have the final answer.
      if (!useTools || !result.tool_calls || result.tool_calls.length === 0) {
        let content = result.content?.trim();
        if (!content && pendingActions.length === 0 && pendingDeliverables.length === 0) {
          return new Response(
            JSON.stringify({ error: "Empty response from model." }),
            { status: 502, headers }
          );
        }
        // Confidence guardrail: if the reply is non-trivial and analytical-looking
        // but doesn't declare confidence, append a soft notice. Avoids enforcing
        // it at the model level where strict rules produce brittle outputs.
        if (content && content.length > 300 && !/confidence:\\s*(low|med|medium|high)/i.test(content)) {
          const unverified = pendingReads.length === 0;
          content += unverified
            ? "\\n\\nconfidence: low — no fresh tool reads this turn, treat as opinion."
            : "\\n\\nconfidence: unstated — agent forgot to declare.";
        }
        return new Response(
          JSON.stringify({
            content: content ?? "(output ready — see deliverables / actions)",
            actions: pendingActions.length ? pendingActions : undefined,
            reads: pendingReads.length ? pendingReads : undefined,
            deliverables: pendingDeliverables.length ? pendingDeliverables : undefined,
          }),
          { status: 200, headers }
        );
      }

      // Execute tool calls and append results.
      messages.push({
        role: "assistant",
        content: result.content ?? "",
        tool_calls: result.tool_calls,
      });
      for (const tc of result.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        // Read-rate-limit: off-chain reads are the expensive/dangerous family.
        const isReadTool =
          tc.function.name === "fetch_url" ||
          tc.function.name === "web_search" ||
          tc.function.name === "get_token_price";
        if (isReadTool && readsThisTurn >= MAX_READS_PER_TURN) {
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              error:
                "read-tool rate limit: max 10 off-chain reads per turn. Wrap up your reply.",
            }),
          });
          continue;
        }
        if (isReadTool) readsThisTurn++;

        const out = await runTool(tc.function.name, args, toolCtx);

        // Drain any read breadcrumb so the UI can surface it — but also keep
        // the data payload for the LLM.
        if (hasReadBreadcrumb(out)) {
          pendingReads.push(out.__read);
        }

        // If this was a propose_* tool, drain the action and tell the LLM
        // the proposal was queued so it doesn't try to "execute" again.
        if (isActionProposal(out)) {
          pendingActions.push(out.__action);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              ok: true,
              queued: true,
              note: "Proposal queued for user approval. Do not propose the same action again. Wrap up your reply.",
            }),
          });
        } else if (isDeliverable(out)) {
          pendingDeliverables.push(out.__deliverable);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              ok: true,
              rendered: true,
              kind: (out.__deliverable as { kind?: string }).kind,
              note: "Deliverable rendered in the UI. Do not repeat its contents in chat — just give a short handoff line.",
            }),
          });
        } else {
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(stripInternalKeys(out)).slice(0, 4000),
          });
        }
      }
    }

    // Loop budget exceeded but we still have something useful to return.
    if (pendingActions.length > 0 || pendingReads.length > 0 || pendingDeliverables.length > 0) {
      return new Response(
        JSON.stringify({
          content: "(output ready — see deliverables / actions)",
          actions: pendingActions.length ? pendingActions : undefined,
          reads: pendingReads.length ? pendingReads : undefined,
          deliverables: pendingDeliverables.length ? pendingDeliverables : undefined,
        }),
        { status: 200, headers }
      );
    }
    return new Response(
      JSON.stringify({
        error: "Tool loop exceeded (max 3 rounds).",
      }),
      { status: 502, headers }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers });
  } finally {
    clearTimeout(timer);
  }
}
`;
}

// ─────────────────────────── app/health/route.ts ───────────────────────────

function healthRouteTs(data: FullBOOAData): string {
  const { token } = data;
  return `// GET /health — liveness probe + config sanity check.
//
// Returns 200 with JSON describing what this endpoint *thinks* is true.
// Meant to be called from the Moltbook Studio endpoint page to help
// holders debug a fresh deploy without opening server logs.
//
// No secrets leak: we only return whether env vars are set, never the values.

import { fetchAgentSnapshot } from "@/lib/khora";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_ID = "${token.tokenId}";

function corsHeaders(): Record<string, string> {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  const headers = { "content-type": "application/json", ...corsHeaders() };
  const hasBase = !!process.env.LLM_API_BASE;
  const hasKey = !!process.env.LLM_API_KEY;
  const hasModel = !!process.env.LLM_MODEL;
  const toolsEnabled = process.env.TOOLS_ENABLED === "true";

  // Best-effort snapshot. Don't fail the health check if Khôra is down.
  let snapshotPreview = "";
  let snapshotOk = false;
  try {
    const s = await fetchAgentSnapshot(TOKEN_ID);
    snapshotOk = s.length > 0 && !s.startsWith("on-chain state: not registered");
    snapshotPreview = s.slice(0, 200);
  } catch {
    // leave defaults
  }

  const configured = hasBase && hasKey && hasModel;
  return new Response(
    JSON.stringify({
      ok: configured,
      tokenId: TOKEN_ID,
      configured: { llmBase: hasBase, llmKey: hasKey, llmModel: hasModel },
      toolsEnabled,
      onChain: { ok: snapshotOk, preview: snapshotPreview },
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers }
  );
}
`;
}

function readme(data: FullBOOAData, slug: string): string {
  const { traits, token } = data;
  return `# ${traits.name} — agent endpoint (BOOA #${token.tokenId})

This is a ready-to-deploy Next.js endpoint for your BOOA. It exposes
\`POST /chat\` — the contract the Moltbook public agent page calls.

**You host this. We never see your LLM key.**

## What makes it different

Out of the box the agent is **on-chain aware**: on every chat it reads its
own live ERC-8004 agent card from the public Khôra API (identity, services,
scores, owner) and injects that snapshot into the system prompt. With
\`TOOLS_ENABLED=true\` it can also call read tools mid-conversation —
\`get_booa\`, \`get_agent_card\`, \`get_gallery_top\` — to talk about other
BOOAs, compare scores, or reference allies by real token id.

## 3-step deploy

### 1 · Install deps
\`\`\`
cd ${slug}
npm install
\`\`\`

### 2 · Add your LLM key

Don't have one yet? Pick any OpenAI-compatible provider:

| Provider | Free tier | Signup | Tool calling |
|----------|-----------|--------|--------------|
| OpenRouter | yes (\`:free\` models) | <https://openrouter.ai/keys> | paid models only |
| Groq | yes (fast) | <https://console.groq.com/keys> | \`llama-3.3-70b-versatile\` ✓ |
| OpenAI | no (paid) | <https://platform.openai.com/api-keys> | all models ✓ |

Copy \`.env.example\` to \`.env.local\` and fill in:
- \`LLM_API_BASE\` — e.g. \`https://openrouter.ai/api/v1\` (free tier works)
- \`LLM_API_KEY\` — from your provider dashboard (links above)
- \`LLM_MODEL\`  — e.g. \`meta-llama/llama-3.1-8b-instruct:free\`
- \`TOOLS_ENABLED\` — \`true\` if your model supports OpenAI tool calling
  (gpt-4o-mini, llama-3.3-70b-versatile on Groq, most paid OpenRouter
  models). Leave blank otherwise — the agent still gets a live snapshot
  every turn via the system prompt.
- \`ALLOWED_ORIGIN\` — set to \`https://moltbooa.vercel.app\` (or your
  Moltbook fork) **before going public**. Default \`*\` is only for dev.

Smoke-test locally:
\`\`\`
npm run dev
# Liveness + config check (no LLM call):
curl http://localhost:3000/health
# Full chat round-trip:
curl -X POST http://localhost:3000/chat \\
  -H 'content-type: application/json' \\
  -d '{"messages":[{"role":"user","content":"what is your agent id? and your trust score?"}]}'
\`\`\`

### 3 · Deploy (pick one)

**Vercel CLI (fastest, no GitHub needed)**
\`\`\`
npm i -g vercel
vercel login
vercel           # first deploy — creates project
vercel env add LLM_API_BASE
vercel env add LLM_API_KEY
vercel env add LLM_MODEL
vercel env add TOOLS_ENABLED
vercel env add ALLOWED_ORIGIN
vercel --prod
\`\`\`

**Vercel via GitHub**
1. Push this folder to a new private GitHub repo.
2. Import on <https://vercel.com/new>.
3. Add env vars on the Vercel dashboard (Settings → Environment Variables).
4. Redeploy.

**Cloudflare Pages / Netlify / Render** — all supported. Just point them
at this folder and configure the same env vars.

## After deploy

1. Copy your production URL (e.g. \`https://${slug}.vercel.app\`).
2. Open \`/studio/${token.tokenId}/endpoint\` on Moltbook.
3. Paste the URL into \`khora.fun/bridge\` to save it on-chain.
4. Your BOOA is live at \`/agent/${token.tokenId}\`.

## What's inside

| File | Purpose |
|------|---------|
| \`app/chat/route.ts\` | The \`POST /chat\` handler (agent protocol). |
| \`app/health/route.ts\` | \`GET /health\` liveness + config probe. |
| \`lib/khora.ts\` | Public Khôra API client (agent-card, booa, gallery). |
| \`lib/tools.ts\` | OpenAI tool schemas + dispatcher (opt-in). |
| \`soul.md\` | Editable personality notes. Edit freely. |
| \`app/page.tsx\` | Minimal landing page at \`/\`. |

## Security notes

- Never commit \`.env.local\`.
- Default rate limit: 20 req/min per IP (tweak in \`route.ts\`).
- Default timeout: 30s per upstream LLM call; 5s per Khôra lookup.
- Prompts are not logged.
- CORS defaults to \`*\` — **change \`ALLOWED_ORIGIN\` before going public**.
- Khôra read APIs are public GETs — no key needed, no data leaks.

---

Generated by Moltbook Studio for BOOA #${token.tokenId}.
`;
}
