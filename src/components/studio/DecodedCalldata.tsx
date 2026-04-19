"use client";

/**
 * Decoded preview for an `AgentAction`.
 *
 * For `kind: "contract"` — ABI is authoritative; we just list function + args.
 * For `kind: "tx"`       — we try known selectors; on miss we show raw hex
 *                          with a loud warning banner.
 */

import type { AgentAction } from "@/lib/actions/types";
import {
  formatArg,
  formatValue,
  tryDecodeCalldata,
} from "@/lib/actions/decode";

interface Props {
  action: AgentAction;
}

export default function DecodedCalldata({ action }: Props) {
  if (action.kind === "sign_msg") {
    return (
      <div className="space-y-1.5">
        <Label>message</Label>
        <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap break-words font-[family-name:var(--font-mono)] bg-background border border-card-border rounded p-2">
          {action.message}
        </pre>
      </div>
    );
  }

  if (action.kind === "typed_data") {
    return (
      <div className="space-y-1.5">
        <Label>EIP-712 · {action.primaryType}</Label>
        <pre className="text-[10px] text-foreground/70 whitespace-pre-wrap break-words font-[family-name:var(--font-mono)] bg-background border border-card-border rounded p-2 max-h-48 overflow-auto">
{JSON.stringify(
  { domain: action.domain, primaryType: action.primaryType, message: action.message },
  null,
  2
)}
        </pre>
      </div>
    );
  }

  if (action.kind === "contract") {
    return (
      <div className="space-y-1.5">
        <Row label="to" value={<Mono>{action.address}</Mono>} />
        <Row
          label="fn"
          value={
            <span className="text-accent-cyan font-[family-name:var(--font-mono)] text-[11px]">
              {action.functionName}
            </span>
          }
        />
        {action.args.length > 0 && (
          <div className="space-y-0.5">
            <Label>args</Label>
            <ul className="text-[10px] font-[family-name:var(--font-mono)] text-foreground/70 bg-background border border-card-border rounded p-2 space-y-0.5">
              {action.args.map((a, i) => (
                <li key={i} className="break-all">
                  <span className="text-foreground/40">[{i}]</span>{" "}
                  {formatArg(a)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.value && action.value !== "0" && (
          <Row label="value" value={<Mono>{formatValue(action.value)}</Mono>} />
        )}
      </div>
    );
  }

  // kind: "tx" — raw calldata
  const decoded = tryDecodeCalldata(action.data);
  return (
    <div className="space-y-1.5">
      <Row label="to" value={<Mono>{action.to}</Mono>} />
      {decoded.matched ? (
        <>
          <Row
            label="fn"
            value={
              <span className="text-accent-cyan font-[family-name:var(--font-mono)] text-[11px]">
                {decoded.functionName}{" "}
                <span className="text-foreground/40 text-[9px]">
                  (matched known ABI)
                </span>
              </span>
            }
          />
          {decoded.args && decoded.args.length > 0 && (
            <div className="space-y-0.5">
              <Label>args</Label>
              <ul className="text-[10px] font-[family-name:var(--font-mono)] text-foreground/70 bg-background border border-card-border rounded p-2 space-y-0.5">
                {decoded.args.map((a, i) => (
                  <li key={i} className="break-all">
                    <span className="text-foreground/40">[{i}]</span>{" "}
                    {formatArg(a)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="rounded border border-accent-red/40 bg-accent-red/5 p-2 space-y-1">
          <div className="text-[10px] font-[family-name:var(--font-pixel)] text-accent-red">
            ⚠ UNKNOWN CALLDATA
          </div>
          <div className="text-[10px] text-foreground/60 leading-relaxed">
            No known ABI matched this selector. You will be signing raw bytes —
            only approve if you understand them.
          </div>
          <pre className="text-[10px] text-foreground/70 break-all font-[family-name:var(--font-mono)] bg-background border border-card-border rounded p-2 max-h-24 overflow-auto">
            {action.data}
          </pre>
        </div>
      )}
      {action.value && action.value !== "0" && (
        <Row label="value" value={<Mono>{formatValue(action.value)}</Mono>} />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-[family-name:var(--font-pixel)] text-foreground/40 tracking-wider">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[10px]">
      <span className="font-[family-name:var(--font-pixel)] text-foreground/40 tracking-wider w-12 shrink-0">
        {label}
      </span>
      <div className="min-w-0 flex-1 break-all">{value}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-mono)] text-foreground/80 text-[11px] break-all">
      {children}
    </span>
  );
}
