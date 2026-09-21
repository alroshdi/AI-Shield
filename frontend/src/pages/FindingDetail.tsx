import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { SeverityBadge, StatusBadge } from "../components/SeverityBadge";
import { TranscriptView } from "../components/TranscriptView";
import { useLanguage } from "../lib/i18n";
import { formatPercent, packLabel } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function FindingDetail() {
  const { t } = useLanguage();
  const { scanId = "", attackId = "" } = useParams();
  const { data: targets } = useApi(() => api.listTargets(), []);
  const { data, error, loading, reload } = useApi(() => api.getScan(scanId), [scanId]);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const finding = data?.findings.find((f) => f.attack_id === attackId);
  const target = targets?.find((tg) => tg.name === data?.manifest.target_name) ?? targets?.[0];

  async function runRescan() {
    if (!target) return;
    setRescanning(true);
    setRescanError(null);
    try {
      await api.rescan(scanId, { target: target.file, finding: attackId });
      reload();
    } catch (err) {
      setRescanError(err instanceof ApiError ? err.message : "Rescan failed — is the target agent running?");
    } finally {
      setRescanning(false);
    }
  }

  async function applyFix() {
    if (!target) return;
    setApplyingFix(true);
    setFixMessage(null);
    try {
      await api.hardenTarget(target.file);
      setFixMessage("Fix applied on the target. Click Rescan to verify it held.");
    } catch (err) {
      setFixMessage(
        err instanceof ApiError
          ? `Could not apply fix: ${err.message}`
          : "Could not apply fix — is the target agent running?",
      );
    } finally {
      setApplyingFix(false);
    }
  }

  if (loading) return <LoadingBlock label={t("findingDetail.loading")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!data || !finding) return <ErrorBlock message={t("findingDetail.notFound")} />;

  return (
    <>
      <div className="mb-4 text-sm">
        <Link to={`/scans/${scanId}`} className="hover:underline" style={{ color: "var(--series-1)" }}>
          ← {t("findingDetail.backTo")} {data.manifest.target_name}
        </Link>
      </div>

      <PageHeader
        title={finding.name}
        subtitle={`${finding.attack_id} · ${packLabel(finding.pack)}`}
        actions={
          <div className="flex gap-2">
            {target?.can_apply_fix && (
              <button
                onClick={applyFix}
                disabled={applyingFix}
                className="rounded-lg border px-3.5 py-2 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                {applyingFix ? t("findingDetail.applying") : t("findingDetail.applyFix")}
              </button>
            )}
            <button
              onClick={runRescan}
              disabled={rescanning || !target}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--series-1)" }}
            >
              {rescanning ? t("findingDetail.rescanning") : t("findingDetail.rescan")}
            </button>
          </div>
        }
      />

      {fixMessage && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
        >
          {fixMessage}
        </div>
      )}

      {rescanError && (
        <div className="mb-4">
          <ErrorBlock message={rescanError} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("findingDetail.attackSuccessRate")}
          </div>
          <div className="mt-1 text-2xl font-semibold">{formatPercent(finding.attack_success_rate)}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {finding.trials_vulnerable} / {finding.trials_run} {t("findingDetail.trialsVulnerable")}
          </div>
        </Card>
        <Card>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("findingDetail.severity")}
          </div>
          <div className="mt-1.5">
            <SeverityBadge band={finding.severity_band} />
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Score {finding.severity_score} · confidence {finding.confidence_avg}
          </div>
        </Card>
        <Card>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("findingDetail.status")}
          </div>
          <div className="mt-1.5">
            <StatusBadge status={finding.needs_review ? "needs_review" : finding.status} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 text-sm font-semibold">{t("findingDetail.threatMapping")}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full px-2.5 py-1" style={{ background: "var(--gridline)" }}>
            {finding.owasp}
          </span>
          <span className="rounded-full px-2.5 py-1" style={{ background: "var(--gridline)" }}>
            {finding.mitre_atlas}
          </span>
          <span className="rounded-full px-2.5 py-1" style={{ background: "var(--gridline)" }}>
            {t("findingDetail.vulnClass")}: {finding.vuln_class}
          </span>
        </div>
      </Card>

      <Card className="mt-4" style={{ borderColor: "color-mix(in srgb, var(--status-good) 30%, var(--border))" }}>
        <div className="mb-2 text-sm font-semibold">{t("findingDetail.suggestedRemediation")}</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {finding.remediation}
        </p>
      </Card>

      <Card className="mt-4">
        <div className="mb-3 text-sm font-semibold">{t("findingDetail.exampleTranscript")}</div>
        <TranscriptView turns={finding.example_transcript} />
      </Card>
    </>
  );
}
