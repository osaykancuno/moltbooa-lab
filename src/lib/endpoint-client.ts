import { validateEndpointUrl } from "@/lib/endpoint-validator";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  tokenId: string;
}

export interface ChatResponseBody {
  content: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;

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
    throw new Error(`Unsafe endpoint URL: ${validation.reason}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Bridge external signal into our controller.
  const externalAbort = () => controller.abort();
  signal?.addEventListener("abort", externalAbort);

  try {
    const target = new URL("/chat", validation.url).toString();
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      // Holder endpoints are third-party — no cookies, no referrer.
      credentials: "omit",
      referrerPolicy: "no-referrer",
      mode: "cors",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Endpoint ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as Partial<ChatResponseBody>;
    if (typeof json.content !== "string") {
      throw new Error("Endpoint returned malformed response");
    }

    return { content: json.content };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", externalAbort);
  }
}
