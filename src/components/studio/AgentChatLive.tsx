"use client";

import { useEffect, useRef, useState } from "react";
import {
  postToAgentEndpoint,
  EndpointError,
  type ChatMessage,
} from "@/lib/endpoint-client";

interface Props {
  tokenId: string;
  agentName: string;
  endpointUrl: string;
}

export default function AgentChatLive({
  tokenId,
  agentName,
  endpointUrl,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `hi. i am ${agentName}. ask me anything.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    headline: string;
    hint?: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await postToAgentEndpoint(
        endpointUrl,
        { messages: next, tokenId },
        controller.signal
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(describeError(err));
      // Keep the user message so they can retry.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="h-64 sm:h-80 overflow-y-auto rounded border border-card-border bg-card-bg p-3 space-y-2 text-xs font-[family-name:var(--font-mono)]"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-right"
                : m.role === "system"
                  ? "text-foreground/40 italic"
                  : ""
            }
          >
            <span
              className={`inline-block max-w-[85%] px-2 py-1.5 rounded ${
                m.role === "user"
                  ? "bg-accent-purple/20 border border-accent-purple/40 text-accent-purple"
                  : "bg-background border border-card-border text-foreground/80"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {busy && (
          <div className="text-[10px] text-foreground/40 font-[family-name:var(--font-pixel)]">
            {agentName.toUpperCase()} IS THINKING…
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-accent-red/40 bg-accent-red/5 p-2 space-y-1 text-[10px] font-[family-name:var(--font-mono)]">
          <div className="text-accent-red">✗ {error.headline}</div>
          {error.hint && (
            <div className="text-foreground/60 leading-relaxed">
              {error.hint}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${agentName}…`}
          maxLength={2000}
          disabled={busy}
          className="flex-1 text-xs px-3 py-2 bg-background border border-card-border rounded focus:outline-none focus:border-accent-purple/60 font-[family-name:var(--font-mono)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="text-[10px] px-4 py-2 rounded border font-[family-name:var(--font-pixel)] bg-accent-purple/20 border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          SEND
        </button>
      </form>

      <p className="text-[9px] text-foreground/30 text-center font-[family-name:var(--font-mono)]">
        chat hosted by BOOA owner · endpoint:{" "}
        <span className="text-foreground/50 break-all">{endpointUrl}</span>
      </p>
    </div>
  );
}

function describeError(err: unknown): { headline: string; hint?: string } {
  if (err instanceof EndpointError) {
    switch (err.kind) {
      case "timeout":
        return {
          headline: "Endpoint timed out",
          hint: "The agent took too long to reply. Serverless cold start? Try again in a moment.",
        };
      case "network":
        return {
          headline: "Could not reach endpoint",
          hint: "Either the endpoint is offline, or CORS is blocking this origin. Owner: set ALLOWED_ORIGIN on the endpoint and redeploy.",
        };
      case "http": {
        const s = err.status;
        if (s === 429) {
          return {
            headline: "Rate limited (429)",
            hint: "Too many requests to this endpoint. Wait a minute and retry.",
          };
        }
        if (s === 500) {
          return {
            headline: "Endpoint server error (500)",
            hint: "Owner: check function logs. Often LLM_API_KEY missing or invalid.",
          };
        }
        if (s === 502) {
          return {
            headline: "Upstream LLM error (502)",
            hint: "The endpoint reached the LLM provider but got an error back. Owner: verify LLM_API_KEY / LLM_MODEL.",
          };
        }
        return { headline: err.message };
      }
      case "malformed":
        return {
          headline: "Endpoint returned an invalid response",
          hint: "Make sure the endpoint follows the Moltbook chat protocol: POST /chat returning { content: string }.",
        };
      case "invalid_url":
        return { headline: err.message };
    }
  }
  return {
    headline: err instanceof Error ? err.message : "Endpoint unreachable",
  };
}
