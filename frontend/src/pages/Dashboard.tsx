import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { ScanTrendChart } from "../components/ScanTrendChart";
import { ScoreMeter } from "../components/ScoreMeter";
import { SeverityBarChart } from "../components/SeverityBarChart";
import { StatTile } from "../components/StatTile";
import { useLanguage } from "../lib/i18n";
import { formatDate, formatPercent, packLabel } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function Dashboard() {
  const { t } = useLanguage();
  const { data: scans, error, loading, reload } = useApi(() => api.listScans(), []);

  if (loading) return <LoadingBlock label={t("dashboard.loading")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!scans || scans.length === 0) {
    return (
      <>
        <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.noScans")} />
        <Card>
          <EmptyBlock message={t("dashboard.emptyMessage")} />
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
        title={t("dashboard.title")}
        subtitle={`Latest scan of ${latest.target_name} — ${formatDate(latest.started_at)}`}
        actions={
          <Link
            to={`/scans/${latest.scan_id}`}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--series-1)" }}
          >
            {t("dashboard.viewLatestReport")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex items-center gap-5 lg:col-span-1">
          <ScoreMeter score={latest.security_score} />
          <div>
            <div className="text-sm font-semibold">{t("dashboard.securityScore")}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("dashboard.securityScoreSub")}
            </div>
          </div>
        </Card>
        <StatTile label={t("dashboard.attacksRun")} value={latest.attacks_run} sub={`${latest.trials_per_attack} trials each`} />
        <StatTile
          label={t("dashboard.vulnerableFindings")}
          value={latest.vulnerable_count}
          accent={latest.vulnerable_count > 0 ? "var(--status-critical)" : "var(--status-good)"}
          sub={`out of ${latest.findings_count} attacks tested`}
        />
        <StatTile label={t("dashboard.totalScansRun")} value={scans.length} sub={`across ${packCounts.size} attack packs`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">{t("dashboard.scoreOverTime")}</div>
          <ScanTrendChart scans={scans} />
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold">{t("dashboard.findingsBySeverity")}</div>
          <SeverityBarChart counts={latest.severity_counts} />
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 text-sm font-semibold">{t("dashboard.recentScans")}</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 font-medium">{t("dashboard.col.target")}</th>
              <th className="pb-2 font-medium">{t("dashboard.col.started")}</th>
              <th className="pb-2 font-medium">{t("dashboard.col.packs")}</th>
              <th className="pb-2 font-medium">{t("dashboard.col.attacks")}</th>
              <th className="pb-2 font-medium">{t("dashboard.col.vulnerable")}</th>
              <th className="pb-2 font-medium">{t("dashboard.col.score")}</th>
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
