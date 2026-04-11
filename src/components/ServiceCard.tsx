"use client";

import type { SimulatedService } from "@/types";

export default function ServiceCard({
  service,
}: {
  service: SimulatedService;
}) {
  return (
    <div className="bg-card-bg border border-accent-yellow/20 rounded-lg p-3 hover:border-accent-yellow/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-yellow/20 flex items-center justify-center text-[8px] font-[family-name:var(--font-pixel)] text-accent-yellow">
            S
          </div>
          <span className="text-sm font-bold text-accent-yellow">
            {service.name}
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            service.completed
              ? "bg-accent-green/20 text-accent-green"
              : "bg-accent-red/20 text-accent-red"
          }`}
        >
          {service.completed ? "COMPLETED" : "PENDING"}
        </span>
      </div>
      <div className="text-[10px] text-foreground/50 space-y-1">
        <div>
          Client: <span className="text-foreground/70">{service.client}</span>
        </div>
        <div>
          Domain: <span className="text-accent-cyan">{service.domain}</span>
        </div>
      </div>
    </div>
  );
}
