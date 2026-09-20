import { useState } from "react";
import type { ScanSummary } from "../types";
import { formatDate, scoreColor } from "../lib/severity";

export function ScanTrendChart({ scans }: { scans: ScanSummary[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (scans.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        Run another scan to see the security score trend over time.
      </div>
    );
  }

  const ordered = [...scans].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const width = 640;
  const height = 160;
  const padX = 12;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = ordered.map((s, i) => {
    const x = padX + (i / (ordered.length - 1)) * innerW;
    const y = padY + (1 - s.security_score / 100) * innerH;
    return { x, y, scan: s };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padY + innerH} L${points[0].x},${padY + innerH} Z`;

  const activePoint = hover !== null ? points[hover] : points[points.length - 1];
  const lineColor = "var(--series-1)";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padY + (1 - tick / 100) * innerH;
          return (
            <line
              key={tick}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
          );
        })}
        <path d={areaPath} fill={lineColor} opacity={0.1} />
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={p.scan.scan_id}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 6 : 4}
            fill={lineColor}
            stroke="var(--surface-1)"
            strokeWidth={2}
            onMouseEnter={() => setHover(i)}
            style={{ cursor: "pointer", transition: "r 120ms ease" }}
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{formatDate(ordered[0].started_at)}</span>
        <span>{formatDate(ordered[ordered.length - 1].started_at)}</span>
      </div>
      {activePoint && (
        <div
          className="pointer-events-none absolute rounded-lg border px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `min(${(activePoint.x / width) * 100}%, 78%)`,
            top: 0,
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            transform: "translate(8px, 0)",
          }}
        >
          <div className="font-semibold" style={{ color: scoreColor(activePoint.scan.security_score) }}>
            {activePoint.scan.security_score}/100
          </div>
          <div style={{ color: "var(--text-secondary)" }}>{formatDate(activePoint.scan.started_at)}</div>
        </div>
      )}
    </div>
  );
}
