import { validateEndpointUrl } from "@/lib/endpoint-validator";
import type { AgentAction, AgentRead } from "@/lib/actions/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  tokenId: string;
}

/**
 * Response shape from the holder-deployed endpoint.
 *
 * `content` is required (backward compat with v1 templates that only reply
 * text). `actions` and `reads` appear on v2 templates with tool surface
 * enabled — the terminal uses them, the public chat (`/agent/[id]`) safely
 * ignores them.
 */
export interface ChatResponseBody {
  content: string;
  actions?: AgentAction[];
  reads?: AgentRead[];
}

const DEFAULT_TIMEOUT_MS = 30_000;

export type EndpointErrorKind =
  | "invalid_url"
  | "timeout"
  | "network" // CORS or unreachable — indistinguishable in browsers
  | "http"
  | "malformed";

export class EndpointError extends Error {
  kind: EndpointErrorKind;
  status?: number;
  constructor(kind: EndpointErrorKind, message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

/**
 * POST a chat payload to a holder-deployed agent endpoint.
 *
 * Contract with the endpoint template:
 *   POST <endpointUrl>/chat
 *   Body:    { messages: ChatMessage[], tokenId: string }
 *   Returns: { content: string }
 *
 * Runs in the *visitor's* browser — our server never proxies the request,
 * so there's no SSRF exposure on our side. The validator still runs to
 * protect visitors from malicious URLs stored on-chain.
 */
export async function postToAgentEndpoint(
  endpointUrl: string,
  body: ChatRequestBody,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ChatResponseBody> {
  const validation = validateEndpointUrl(endpointUrl);
  if (!validation.ok) {
    throw new EndpointError(
      "invalid_url",
      `Unsafe endpoint URL: ${validation.reason}`
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let timedOut = false;
  const timeoutWatch = setTimeout(() => {
    timedOut = true;
  }, timeoutMs);

  // Bridge external signal into our controller.
  const externalAbort = () => controller.abort();
  signal?.addEventListener("abort", externalAbort);

  try {
    const target = new URL("/chat", validation.url).toString();
    let res: Response;
    try {
      res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        // Holder endpoints are third-party — no cookies, no referrer.
        credentials: "omit",
        referrerPolicy: "no-referrer",
        mode: "cors",
      });
    } catch (err) {
      if (timedOut || controller.signal.aborted) {
        throw new EndpointError("timeout", "Request timed out");
      }
      // Browsers surface CORS, DNS, and offline failures all as TypeError.
      throw new EndpointError(
        "network",
        err instanceof Error ? err.message : "Network error"
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new EndpointError(
        "http",
        `HTTP ${res.status}: ${text.slice(0, 200)}`,
        res.status
      );
    }

    let json: Partial<ChatResponseBody>;
    try {
      json = (await res.json()) as Partial<ChatResponseBody>;
    } catch {
      throw new EndpointError(
        "malformed",
        "Endpoint returned non-JSON response"
      );
    }
    if (typeof json.content !== "string") {
      throw new EndpointError(
        "malformed",
        "Endpoint response missing `content` field"
      );
    }

    return {
      content: json.content,
      actions: Array.isArray(json.actions) ? json.actions : undefined,
      reads: Array.isArray(json.reads) ? json.reads : undefined,
    };
  } finally {
    clearTimeout(timer);
    clearTimeout(timeoutWatch);
    signal?.removeEventListener("abort", externalAbort);
  }
}
