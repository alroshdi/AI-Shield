import type { SeverityBand } from "../types";
import { SEVERITY_COLOR, SEVERITY_ORDER } from "../lib/severity";

export function SeverityBarChart({ counts }: { counts: Record<SeverityBand, number> }) {
  const max = Math.max(1, ...SEVERITY_ORDER.map((b) => counts[b] ?? 0));

  return (
    <div className="flex flex-col gap-3">
      {SEVERITY_ORDER.map((band) => {
        const value = counts[band] ?? 0;
        const widthPct = (value / max) * 100;
        return (
          <div key={band} className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {band}
            </div>
            <div className="relative h-4 flex-1 rounded" style={{ background: "var(--gridline)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: value === 0 ? 0 : `max(${widthPct}%, 8px)`,
                  background: SEVERITY_COLOR[band],
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <div className="tabular w-6 shrink-0 text-right text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
