import type { ReactNode } from "react";

export interface Step {
  title: string;
  body: ReactNode;
  status?: "done" | "current" | "todo";
}

/**
 * Numbered instruction list — the same visual language across /studio,
 * the cockpit, the register wizard, and the endpoint wizard so users
 * always know where they are.
 */
export default function Steps({
  steps,
  heading,
}: {
  steps: Step[];
  heading?: string;
}) {
  return (
    <div className="space-y-3">
      {heading && (
        <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-accent-purple tracking-wider">
          {heading}
        </h2>
      )}
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const status = step.status ?? "todo";
          const toneCircle =
            status === "done"
              ? "bg-accent-green/20 border-accent-green/50 text-accent-green"
              : status === "current"
                ? "bg-accent-purple/20 border-accent-purple/50 text-accent-purple"
                : "bg-card-bg border-card-border text-foreground/50";
          const toneTitle =
            status === "done"
              ? "text-accent-green"
              : status === "current"
                ? "text-accent-purple"
                : "text-foreground/70";

          return (
            <li key={i} className="flex gap-3">
              <div
                className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center font-[family-name:var(--font-pixel)] text-[10px] ${toneCircle}`}
                aria-hidden
              >
                {status === "done" ? "✓" : i + 1}
              </div>
              <div className="flex-1 space-y-1">
                <div
                  className={`font-[family-name:var(--font-pixel)] text-[10px] ${toneTitle}`}
                >
                  {step.title}
                </div>
                <div className="text-[11px] text-foreground/60 leading-relaxed">
                  {step.body}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
