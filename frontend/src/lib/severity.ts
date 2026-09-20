import type { SeverityBand } from "../types";

export const SEVERITY_ORDER: SeverityBand[] = ["Critical", "High", "Medium", "Low"];

export const SEVERITY_COLOR: Record<SeverityBand, string> = {
  Critical: "var(--status-critical)",
  High: "var(--status-serious)",
  Medium: "var(--status-warning)",
  Low: "var(--status-good)",
};

export function severityRank(band: SeverityBand): number {
  return SEVERITY_ORDER.indexOf(band);
}

export function scoreColor(score: number): string {
  if (score >= 90) return "var(--status-good)";
  if (score >= 70) return "var(--status-warning)";
  if (score >= 40) return "var(--status-serious)";
  return "var(--status-critical)";
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function packLabel(pack: string): string {
  return pack
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
