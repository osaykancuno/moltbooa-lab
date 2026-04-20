"use client";

/**
 * Renders a consultant-style deliverable emitted by the agent via
 * render_report / render_comparison / render_plan.
 *
 * These are NOT signed actions — they're outputs. They sit in their own
 * pane in the terminal so the holder can re-read, copy, or download them
 * without scrolling through chat history.
 *
 * Safety: we do our own minimal Markdown → React rendering (headings,
 * paragraphs, lists, inline code, bold/italic, links) instead of pulling
 * in a parser. Links open in a new tab with noopener. HTML is NEVER
 * interpreted — the content comes from an untrusted endpoint.
 */

import { useMemo } from "react";
import type { AgentDeliverable } from "@/lib/actions/types";

interface Props {
  deliverable: AgentDeliverable;
}

export default function DeliverableCard({ deliverable }: Props) {
  return (
    <div className="rounded border border-accent-cyan/40 bg-accent-cyan/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-pixel)] text-[9px] text-accent-cyan tracking-wider">
            {deliverable.kind === "report"
              ? "REPORT"
              : deliverable.kind === "comparison"
                ? "COMPARISON"
                : "PLAN"}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[12px] text-foreground/90 leading-tight break-words">
            {deliverable.title}
          </div>
        </div>
        <DownloadButton deliverable={deliverable} />
      </div>

      {deliverable.kind === "report" && (
        <ReportBody markdown={deliverable.markdown} />
      )}
      {deliverable.kind === "comparison" && (
        <ComparisonBody
          columns={deliverable.columns}
          rows={deliverable.rows}
          summary={deliverable.summary}
        />
      )}
      {deliverable.kind === "plan" && (
        <PlanBody steps={deliverable.steps} summary={deliverable.summary} />
      )}
    </div>
  );
}

function DownloadButton({ deliverable }: Props) {
  const filename = `${deliverable.kind}-${deliverable.id.slice(0, 8)}.md`;
  const onClick = () => {
    const md = toMarkdown(deliverable);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={onClick}
      className="text-[9px] px-2 py-1 rounded border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 font-[family-name:var(--font-pixel)] shrink-0"
      title="Download as Markdown"
    >
      ↓ MD
    </button>
  );
}

function toMarkdown(d: AgentDeliverable): string {
  if (d.kind === "report") {
    return `# ${d.title}\n\n${d.markdown}\n`;
  }
  if (d.kind === "comparison") {
    const head = `| ${d.columns.join(" | ")} |`;
    const sep = `| ${d.columns.map(() => "---").join(" | ")} |`;
    const rows = d.rows
      .map(
        (r) =>
          `| ${d.columns
            .map((c) => String(r[c] ?? "").replace(/\|/g, "\\|"))
            .join(" | ")} |`
      )
      .join("\n");
    return `# ${d.title}\n\n${head}\n${sep}\n${rows}\n${
      d.summary ? `\n**Summary:** ${d.summary}\n` : ""
    }`;
  }
  // plan
  const steps = d.steps
    .map((s) => `${s.n}. **${s.title}**${s.detail ? `\n   ${s.detail}` : ""}`)
    .join("\n");
  return `# ${d.title}\n\n${steps}\n${
    d.summary ? `\n**Summary:** ${d.summary}\n` : ""
  }`;
}

// ─────────────────────────── Report ───────────────────────────

function ReportBody({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  return (
    <div className="text-[11px] text-foreground/80 font-[family-name:var(--font-mono)] leading-relaxed space-y-2 max-h-96 overflow-y-auto">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

// ─────────────────────────── Comparison ───────────────────────────

function ComparisonBody({
  columns,
  rows,
  summary,
}: {
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  summary?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-[family-name:var(--font-mono)] border-collapse">
          <thead>
            <tr className="border-b border-accent-cyan/30">
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-2 py-1.5 text-accent-cyan font-[family-name:var(--font-pixel)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-card-border/50">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-foreground/80 align-top">
                    {formatCell(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary && (
        <p className="text-[10px] text-foreground/70 leading-relaxed border-l-2 border-accent-cyan/40 pl-2">
          {summary}
        </p>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString();
    if (!Number.isInteger(v)) return v.toFixed(4).replace(/\.?0+$/, "");
    return String(v);
  }
  return String(v);
}

// ─────────────────────────── Plan ───────────────────────────

function PlanBody({
  steps,
  summary,
}: {
  steps: Array<{ n: number; title: string; detail?: string; actionId?: string }>;
  summary?: string;
}) {
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-2 text-[11px]">
            <span className="shrink-0 font-[family-name:var(--font-pixel)] text-accent-cyan text-[9px] w-5 pt-0.5">
              {String(s.n).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="text-foreground/90 font-[family-name:var(--font-mono)] leading-snug">
                {s.title}
              </div>
              {s.detail && (
                <div className="text-[10px] text-foreground/60 leading-relaxed mt-0.5">
                  {s.detail}
                </div>
              )}
              {s.actionId && (
                <div className="text-[9px] text-accent-purple/70 font-[family-name:var(--font-mono)] mt-0.5">
                  ↪ action {s.actionId.slice(0, 8)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {summary && (
        <p className="text-[10px] text-foreground/70 leading-relaxed border-l-2 border-accent-cyan/40 pl-2">
          {summary}
        </p>
      )}
    </div>
  );
}

// ─────────────────────── tiny Markdown parser ───────────────────────
//
// We handle: # ## ### headings, - and * bullet lists, 1. numbered
// lists, paragraphs, `inline code`, **bold**, *italic*, [text](url).
// Everything else is treated as plain text. HTML is never rendered.

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string };

function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // fenced code
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", text: buf.join("\n") });
      continue;
    }
    // heading
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({
        type: "heading",
        level: h[1].length as 1 | 2 | 3,
        text: h[2],
      });
      i++;
      continue;
    }
    // ul
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    // ol
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    // paragraph
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s|```)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") });
  }
  return blocks;
}

function renderBlock(b: Block, key: number): React.ReactNode {
  switch (b.type) {
    case "heading": {
      const cls =
        b.level === 1
          ? "text-[13px] text-accent-cyan font-[family-name:var(--font-pixel)] mt-2"
          : b.level === 2
            ? "text-[12px] text-foreground/90 font-[family-name:var(--font-pixel)] mt-2"
            : "text-[11px] text-foreground/80 font-[family-name:var(--font-pixel)] mt-1";
      return (
        <div key={key} className={cls}>
          {renderInline(b.text)}
        </div>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="text-foreground/80 leading-relaxed">
          {renderInline(b.text)}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc pl-4 space-y-0.5">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal pl-4 space-y-0.5">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre
          key={key}
          className="bg-background border border-card-border rounded px-2 py-1.5 text-[10px] overflow-x-auto whitespace-pre-wrap break-words"
        >
          <code>{b.text}</code>
        </pre>
      );
  }
}

// Inline parser: **bold**, *italic*, `code`, [text](url). No HTML.
function renderInline(src: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > lastIndex) parts.push(src.slice(lastIndex, m.index));
    const token = m[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={k++}
          className="px-1 rounded bg-background border border-card-border text-accent-cyan"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={k++} className="text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={k++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (lm) {
        const href = sanitizeHref(lm[2]);
        parts.push(
          href ? (
            <a
              key={k++}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-purple hover:underline"
            >
              {lm[1]}
            </a>
          ) : (
            <span key={k++}>{lm[1]}</span>
          )
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < src.length) parts.push(src.slice(lastIndex));
  return parts;
}

function sanitizeHref(href: string): string | null {
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return href;
  if (lower.startsWith("ipfs://")) return href;
  return null; // reject javascript:, data:, file:, etc.
}
