import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { ScanTrendChart } from "../components/ScanTrendChart";
import { ScoreMeter } from "../components/ScoreMeter";
import { SeverityBarChart } from "../components/SeverityBarChart";
import { StatTile } from "../components/StatTile";
import { formatDate, formatPercent, packLabel } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function Dashboard() {
  const { data: scans, error, loading, reload } = useApi(() => api.listScans(), []);

  if (loading) return <LoadingBlock label="Loading scan history…" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!scans || scans.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="No scans yet." />
        <Card>
          <EmptyBlock message="Run your first scan from the Scans page to populate the dashboard." />
        </Card>
      </>
    );
  }

  const latest = scans[0];
  const packCounts = new Map<string, number>();
  for (const s of scans) for (const p of s.packs) packCounts.set(p, (packCounts.get(p) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Latest scan of ${latest.target_name} — ${formatDate(latest.started_at)}`}
        actions={
          <Link
            to={`/scans/${latest.scan_id}`}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--series-1)" }}
          >
            View latest report
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex items-center gap-5 lg:col-span-1">
          <ScoreMeter score={latest.security_score} />
          <div>
            <div className="text-sm font-semibold">Security score</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              100 minus average risk across every attack
            </div>
          </div>
        </Card>
        <StatTile label="Attacks run (latest scan)" value={latest.attacks_run} sub={`${latest.trials_per_attack} trials each`} />
        <StatTile
          label="Vulnerable findings"
          value={latest.vulnerable_count}
          accent={latest.vulnerable_count > 0 ? "var(--status-critical)" : "var(--status-good)"}
          sub={`out of ${latest.findings_count} attacks tested`}
        />
        <StatTile label="Total scans run" value={scans.length} sub={`across ${packCounts.size} attack packs`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Security score over time</div>
          <ScanTrendChart scans={scans} />
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold">Findings by severity (latest scan)</div>
          <SeverityBarChart counts={latest.severity_counts} />
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 text-sm font-semibold">Recent scans</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 font-medium">Target</th>
              <th className="pb-2 font-medium">Started</th>
              <th className="pb-2 font-medium">Packs</th>
              <th className="pb-2 font-medium">Attacks</th>
              <th className="pb-2 font-medium">Vulnerable</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {scans.slice(0, 8).map((s) => (
              <tr key={s.scan_id} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2">
                  <Link to={`/scans/${s.scan_id}`} className="font-medium hover:underline" style={{ color: "var(--series-1)" }}>
                    {s.target_name}
                  </Link>
                  <div className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.scan_id}
                  </div>
                </td>
                <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(s.started_at)}
                </td>
                <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                  {s.packs.map(packLabel).join(", ")}
                </td>
                <td className="tabular py-2">{s.attacks_run}</td>
                <td className="tabular py-2">
                  {s.vulnerable_count}
                  <span style={{ color: "var(--text-muted)" }}> ({formatPercent(s.vulnerable_count / Math.max(1, s.findings_count))})</span>
                </td>
                <td className="tabular py-2 font-semibold">{s.security_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
