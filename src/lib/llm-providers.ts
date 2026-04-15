/**
 * LLM provider configs for "Talk to your BOOA".
 *
 * All providers selected here have a free tier as of 2025.
 * The user supplies their own API key — it is stored only in localStorage
 * and never sent to MoltBooa Lab servers. Calls go directly browser → provider.
 */

export type ProviderId = "openrouter" | "groq" | "huggingface";

export interface ProviderModel {
  id: string;
  label: string;
  free: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  description: string;
  signupUrl: string;
  apiKeyHelpUrl: string;
  /** Default model (free) */
  defaultModel: string;
  /** Available models */
  models: ProviderModel[];
  /** OpenAI-compatible chat completions endpoint */
  endpoint: string;
  /** Whether the provider supports OpenAI-style /chat/completions */
  openAICompatible: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    description:
      "Aggregator with many free models (Llama 3.3, Gemini 2.0, Mistral, Qwen).",
    signupUrl: "https://openrouter.ai/",
    apiKeyHelpUrl: "https://openrouter.ai/keys",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    openAICompatible: true,
    models: [
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        label: "Llama 3.3 70B (free)",
        free: true,
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        label: "Gemini 2.0 Flash (free)",
        free: true,
      },
      {
        id: "mistralai/mistral-7b-instruct:free",
        label: "Mistral 7B (free)",
        free: true,
      },
      {
        id: "qwen/qwen-2.5-72b-instruct:free",
        label: "Qwen 2.5 72B (free)",
        free: true,
      },
    ],
  },
  groq: {
    id: "groq",
    label: "Groq",
    description: "Ultra-fast inference. Generous free tier.",
    signupUrl: "https://groq.com/",
    apiKeyHelpUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    openAICompatible: true,
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile",
        free: true,
      },
      {
        id: "llama-3.1-8b-instant",
        label: "Llama 3.1 8B Instant",
        free: true,
      },
      {
        id: "mixtral-8x7b-32768",
        label: "Mixtral 8x7B",
        free: true,
      },
    ],
  },
  huggingface: {
    id: "huggingface",
    label: "Hugging Face",
    description: "Inference API for open models. Free with rate limits.",
    signupUrl: "https://huggingface.co/join",
    apiKeyHelpUrl: "https://huggingface.co/settings/tokens",
    defaultModel: "meta-llama/Llama-3.2-3B-Instruct",
    endpoint:
      "https://api-inference.huggingface.co/models/{model}/v1/chat/completions",
    openAICompatible: true,
    models: [
      {
        id: "meta-llama/Llama-3.2-3B-Instruct",
        label: "Llama 3.2 3B Instruct",
        free: true,
      },
      {
        id: "HuggingFaceH4/zephyr-7b-beta",
        label: "Zephyr 7B Beta",
        free: true,
      },
      {
        id: "mistralai/Mistral-7B-Instruct-v0.3",
        label: "Mistral 7B Instruct v0.3",
        free: true,
      },
    ],
  },
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  provider: ProviderId;
  model: string;
  apiKey: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a chat completion request directly from the browser to the provider.
 * The API key never touches MoltBooa Lab servers.
 */
export async function chatCompletion(req: ChatRequest): Promise<string> {
  const config = PROVIDERS[req.provider];
  const endpoint = config.endpoint.replace("{model}", req.model);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${req.apiKey}`,
  };

  // OpenRouter requires referer + title for free models
  if (req.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://moltbooa-lab.vercel.app";
    headers["X-Title"] = "MoltBooa Lab";
  }

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0.85,
    max_tokens: req.maxTokens ?? 400,
  };

  // HuggingFace router doesn't accept the model field in the body when included in the URL
  if (req.provider === "huggingface") {
    delete body.model;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${config.label} error (${res.status}): ${text.slice(0, 200) || res.statusText}`
    );
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  if (!content) {
    throw new Error("Empty response from provider");
  }

  return content.trim();
}
