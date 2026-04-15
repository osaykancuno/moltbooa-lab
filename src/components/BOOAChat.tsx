"use client";

import { useEffect, useRef, useState } from "react";
import type { FullBOOAData, SimulationResult } from "@/types";
import {
  PROVIDERS,
  type ProviderId,
  type ChatMessage,
  chatCompletion,
} from "@/lib/llm-providers";
import { buildBOOASystemPrompt, buildOpeningMessage } from "@/lib/booa-prompt";

const STORAGE_KEY_PROVIDER = "moltbooa.chat.provider";
const STORAGE_KEY_MODEL = "moltbooa.chat.model";
const storageKeyForApi = (p: ProviderId) => `moltbooa.chat.apiKey.${p}`;

export default function BOOAChat({
  data,
  sim,
}: {
  data: FullBOOAData;
  sim: SimulationResult;
}) {
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [model, setModel] = useState<string>(PROVIDERS.openrouter.defaultModel);
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const systemPrompt = buildBOOASystemPrompt(data, sim);
  const openingMessage = buildOpeningMessage(data);

  // Load persisted settings
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEY_PROVIDER) as ProviderId | null;
      const m = localStorage.getItem(STORAGE_KEY_MODEL);
      if (p && PROVIDERS[p]) {
        setProvider(p);
        const validModel =
          m && PROVIDERS[p].models.some((mm) => mm.id === m)
            ? m
            : PROVIDERS[p].defaultModel;
        setModel(validModel);
        const k = localStorage.getItem(storageKeyForApi(p)) ?? "";
        setApiKey(k);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Persist provider + model
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
      localStorage.setItem(STORAGE_KEY_MODEL, model);
    } catch {
      // ignore
    }
  }, [provider, model]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  function switchProvider(p: ProviderId) {
    setProvider(p);
    setModel(PROVIDERS[p].defaultModel);
    try {
      const k = localStorage.getItem(storageKeyForApi(p)) ?? "";
      setApiKey(k);
    } catch {
      setApiKey("");
    }
  }

  function saveApiKey(k: string) {
    setApiKey(k);
    try {
      if (k) {
        localStorage.setItem(storageKeyForApi(provider), k);
      } else {
        localStorage.removeItem(storageKeyForApi(provider));
      }
    } catch {
      // ignore
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!apiKey) {
      setError(`Please add your ${PROVIDERS[provider].label} API key first.`);
      setShowSettings(true);
      return;
    }

    setError("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const reply = await chatCompletion({
        provider,
        model,
        apiKey,
        messages: [
          { role: "system", content: systemPrompt },
          ...next,
        ],
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      // Roll back the user message so they can retry
      setMessages(messages);
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const config = PROVIDERS[provider];

  return (
    <div className="gradient-border p-4 rounded-lg space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
            TALK TO {data.traits.name.toUpperCase()}
          </h3>
          <p className="text-[9px] text-foreground/40 mt-0.5">
            Real LLM chat. Your API key stays in your browser.
          </p>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[9px] px-2 py-1 bg-card-bg border border-card-border text-foreground/50 rounded hover:text-foreground/80 transition-colors font-[family-name:var(--font-pixel)]"
            >
              CLEAR
            </button>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-[9px] px-2 py-1 bg-card-bg border border-card-border text-foreground/50 rounded hover:text-foreground/80 transition-colors font-[family-name:var(--font-pixel)]"
          >
            {showSettings ? "HIDE" : "SETTINGS"}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-black/50 rounded p-3 space-y-3 border border-card-border">
          <div>
            <label className="text-[9px] text-foreground/50 font-[family-name:var(--font-pixel)] block mb-1">
              PROVIDER
            </label>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(PROVIDERS) as ProviderId[]).map((p) => (
                <button
                  key={p}
                  onClick={() => switchProvider(p)}
                  className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-all ${
                    provider === p
                      ? "bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/50"
                      : "bg-card-bg text-foreground/40 border border-card-border hover:text-foreground/60"
                  }`}
                >
                  {PROVIDERS[p].label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-foreground/40 mt-1">
              {config.description}
            </p>
          </div>

          <div>
            <label className="text-[9px] text-foreground/50 font-[family-name:var(--font-pixel)] block mb-1">
              MODEL
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full text-[11px] bg-card-bg border border-card-border rounded px-2 py-1.5 text-foreground/80"
            >
              {config.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] text-foreground/50 font-[family-name:var(--font-pixel)] block mb-1">
              {config.label.toUpperCase()} API KEY
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="w-full text-[11px] bg-card-bg border border-card-border rounded px-2 py-1.5 text-foreground/80 font-[family-name:var(--font-mono)]"
            />
            <p className="text-[9px] text-foreground/40 mt-1">
              Stored only in your browser. Never sent to MoltBooa Lab.{" "}
              <a
                href={config.apiKeyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-cyan hover:underline"
              >
                Get a free key →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="bg-black/60 rounded p-3 max-h-80 overflow-y-auto space-y-3 border border-card-border min-h-[180px]"
      >
        {messages.length === 0 && (
          <div className="text-[11px] text-accent-green font-[family-name:var(--font-mono)] leading-relaxed">
            <span className="text-accent-cyan">{data.traits.name}:</span>{" "}
            {openingMessage}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className="text-[11px] font-[family-name:var(--font-mono)] leading-relaxed"
          >
            <span
              className={
                m.role === "user" ? "text-accent-purple" : "text-accent-cyan"
              }
            >
              {m.role === "user" ? "you" : data.traits.name.toLowerCase()}:
            </span>{" "}
            <span className="text-foreground/80 whitespace-pre-wrap">
              {m.content}
            </span>
          </div>
        ))}
        {busy && (
          <div className="text-[11px] text-foreground/40 font-[family-name:var(--font-mono)]">
            <span className="text-accent-cyan">
              {data.traits.name.toLowerCase()}
            </span>
            <span className="animate-pulse"> is typing...</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-accent-red font-[family-name:var(--font-mono)]">
          {error}
        </p>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${data.traits.name}...`}
          rows={2}
          disabled={busy}
          className="flex-1 text-[11px] bg-card-bg border border-card-border rounded px-3 py-2 text-foreground/80 font-[family-name:var(--font-mono)] resize-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="text-[10px] px-4 bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan rounded hover:bg-accent-cyan/30 disabled:opacity-40 transition-all font-[family-name:var(--font-pixel)]"
        >
          {busy ? "..." : "SEND"}
        </button>
      </div>
    </div>
  );
}
