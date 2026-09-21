import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { ScoreMeter } from "../components/ScoreMeter";
import { SeverityBadge, StatusBadge } from "../components/SeverityBadge";
import { StatTile } from "../components/StatTile";
import { useLanguage } from "../lib/i18n";
import { formatDate, formatPercent, packLabel, severityRank } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function ScanDetail() {
  const { t } = useLanguage();
  const { scanId = "" } = useParams();
  const { data: report, error, loading, reload } = useApi(() => api.getScan(scanId), [scanId]);

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [packFilter, setPackFilter] = useState<string>("all");

  const findings = useMemo(() => {
    if (!report) return [];
    return report.findings
      .filter((f) => severityFilter === "all" || f.severity_band === severityFilter)
      .filter((f) => packFilter === "all" || f.pack === packFilter)
      .sort((a, b) => severityRank(a.severity_band) - severityRank(b.severity_band) || b.attack_success_rate - a.attack_success_rate);
  }, [report, severityFilter, packFilter]);

  if (loading) return <LoadingBlock label={t("scanDetail.loading")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!report) return null;

  const vulnerable = report.findings.filter((f) => f.attack_success_rate > 0).length;
  const needsReview = report.findings.filter((f) => f.needs_review).length;
  const packs = Array.from(new Set(report.findings.map((f) => f.pack)));

  return (
    <>
      <PageHeader
        title={report.manifest.target_name}
        subtitle={`Scan ${report.manifest.scan_id} · ${formatDate(report.manifest.started_at)} · authorized by ${report.manifest.authorized_by}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex items-center gap-5">
          <ScoreMeter score={report.security_score} size={96} />
          <div>
            <div className="text-sm font-semibold">{t("scanDetail.securityScore")}</div>
          </div>
        </Card>
        <StatTile label={t("scanDetail.attacksRun")} value={report.attacks_run} sub={`${report.manifest.trials_per_attack} trials each`} />
        <StatTile
          label={t("scanDetail.vulnerable")}
          value={vulnerable}
          accent={vulnerable > 0 ? "var(--status-critical)" : "var(--status-good)"}
        />
        <StatTile
          label={t("scanDetail.needsReview")}
          value={needsReview}
          accent={needsReview > 0 ? "var(--status-warning)" : undefined}
          sub={t("scanDetail.needsReviewSub")}
        />
      </div>

      <Card className="mt-4">
        <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div style={{ color: "var(--text-muted)" }}>{t("scanDetail.corpusVersion")}</div>
            <div className="tabular font-medium">{report.manifest.corpus_version}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)" }}>{t("scanDetail.configHash")}</div>
            <div className="tabular font-medium">{report.manifest.config_hash}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)" }}>{t("scanDetail.packs")}</div>
            <div className="font-medium">{report.manifest.packs.map(packLabel).join(", ")}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)" }}>{t("scanDetail.trialsPerAttack")}</div>
            <div className="font-medium">{report.manifest.trials_per_attack}</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">{t("scanDetail.findings")} ({findings.length})</div>
          <div className="flex gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border px-2.5 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <option value="all">{t("scanDetail.allSeverities")}</option>
              {["Critical", "High", "Medium", "Low"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={packFilter}
              onChange={(e) => setPackFilter(e.target.value)}
              className="rounded-lg border px-2.5 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <option value="all">{t("scanDetail.allPacks")}</option>
              {packs.map((p) => (
                <option key={p} value={p}>
                  {packLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-start" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 font-medium">{t("scanDetail.col.attack")}</th>
              <th className="pb-2 font-medium">{t("scanDetail.col.owasp")}</th>
              <th className="pb-2 font-medium">{t("scanDetail.col.asr")}</th>
              <th className="pb-2 font-medium">{t("scanDetail.col.severity")}</th>
              <th className="pb-2 font-medium">{t("scanDetail.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.attack_id} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2.5">
                  <Link
                    to={`/scans/${scanId}/findings/${f.attack_id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--series-1)" }}
                  >
                    {f.name}
                  </Link>
                  <div className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
                    {f.attack_id} · {packLabel(f.pack)}
                  </div>
                </td>
                <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                  {f.owasp}
                </td>
                <td className="tabular py-2.5 font-medium">{formatPercent(f.attack_success_rate)}</td>
                <td className="py-2.5">
                  <SeverityBadge band={f.severity_band} />
                </td>
                <td className="py-2.5">
                  <StatusBadge status={f.needs_review ? "needs_review" : f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
