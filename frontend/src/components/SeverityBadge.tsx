import type { SeverityBand } from "../types";
import { SEVERITY_COLOR } from "../lib/severity";

export function SeverityBadge({ band }: { band: SeverityBand }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color: SEVERITY_COLOR[band],
        background: `color-mix(in srgb, ${SEVERITY_COLOR[band]} 14%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLOR[band] }} />
      {band}
    </span>
  );
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  new: { label: "New finding", tone: "var(--status-critical)" },
  still_vulnerable: { label: "Still vulnerable", tone: "var(--status-critical)" },
  fixed: { label: "Fixed", tone: "var(--status-good)" },
  needs_review: { label: "Needs review", tone: "var(--status-warning)" },
  not_vulnerable: { label: "Not vulnerable", tone: "var(--status-good)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, tone: "var(--text-muted)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: s.tone, background: `color-mix(in srgb, ${s.tone} 14%, transparent)` }}
    >
      {s.label}
    </span>
  );
}
