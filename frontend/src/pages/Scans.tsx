import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { SeverityBadge } from "../components/SeverityBadge";
import { formatDate, formatPercent, packLabel, scoreColor } from "../lib/severity";
import { useApi } from "../lib/useApi";
import type { SeverityBand } from "../types";

export function Scans() {
  const { data: scans, error, loading, reload } = useApi(() => api.listScans(), []);
  const { data: targets } = useApi(() => api.listTargets(), []);
  const { data: corpus } = useApi(() => api.corpus(), []);
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [target, setTarget] = useState("");
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [trials, setTrials] = useState(3);
  const [authorizedBy, setAuthorizedBy] = useState("hajeralroshdi@gmail.com");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const packNames = corpus ? Object.keys(corpus) : [];
  const effectiveTarget = target || targets?.[0]?.file || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const report = await api.runScan({
        target: effectiveTarget,
        packs: selectedPacks.length > 0 ? selectedPacks : undefined,
        trials,
        authorized_by: authorizedBy,
      });
      navigate(`/scans/${report.manifest.scan_id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not run the scan — is the target agent running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(scanId: string) {
    if (!window.confirm(`Delete scan ${scanId}? This cannot be undone.`)) return;
    setDeletingId(scanId);
    setDeleteError(null);
    try {
      await api.deleteScan(scanId);
      reload();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Could not delete this scan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Scans"
        subtitle="Every scan run against a target, newest first."
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--series-1)" }}
          >
            {showForm ? "Cancel" : "New scan"}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Target</span>
              <select
                value={effectiveTarget}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                {targets?.map((t) => (
                  <option key={t.file} value={t.file}>
                    {t.name} ({t.file})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Trials per attack</span>
              <input
                type="number"
                min={1}
                max={10}
                value={trials}
                onChange={(e) => setTrials(Number(e.target.value))}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-medium">Attack packs (none selected = all)</span>
              <div className="flex flex-wrap gap-2">
                {packNames.map((p) => {
                  const active = selectedPacks.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() =>
                        setSelectedPacks((prev) => (active ? prev.filter((x) => x !== p) : [...prev, p]))
                      }
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: active ? "var(--series-1)" : "var(--border)",
                        background: active ? "color-mix(in srgb, var(--series-1) 14%, transparent)" : "transparent",
                        color: active ? "var(--series-1)" : "var(--text-secondary)",
                      }}
                    >
                      {packLabel(p)}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-medium">Authorized by</span>
              <input
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </label>

            {formError && <div className="md:col-span-2 text-sm" style={{ color: "var(--status-critical)" }}>{formError}</div>}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting || !effectiveTarget}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--series-1)" }}
              >
                {submitting ? "Running scan…" : "Run scan"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {deleteError && (
        <div className="mb-4">
          <ErrorBlock message={deleteError} />
        </div>
      )}

      {loading && <LoadingBlock label="Loading scans…" />}
      {error && <ErrorBlock message={error} onRetry={reload} />}
      {scans && scans.length === 0 && (
        <Card>
          <EmptyBlock message="No scans yet — click New scan to run one." />
        </Card>
      )}
      {scans && scans.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">Scan</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium">Started</th>
                <th className="pb-2 font-medium">Trials</th>
                <th className="pb-2 font-medium">Attacks</th>
                <th className="pb-2 font-medium">Severity mix</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.scan_id} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-2.5">
                    <Link to={`/scans/${s.scan_id}`} className="tabular font-medium hover:underline" style={{ color: "var(--series-1)" }}>
                      {s.scan_id}
                    </Link>
                  </td>
                  <td className="py-2.5">{s.target_name}</td>
                  <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(s.started_at)}
                  </td>
                  <td className="tabular py-2.5">{s.trials_per_attack}</td>
                  <td className="py-2.5">
                    {s.attacks_run}{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      ({s.vulnerable_count} vulnerable, {formatPercent(s.vulnerable_count / Math.max(1, s.findings_count))})
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      {Object.values(s.severity_counts).every((c) => c === 0) ? (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          none
                        </span>
                      ) : (
                        (Object.entries(s.severity_counts) as [SeverityBand, number][])
                          .filter(([, count]) => count > 0)
                          .map(([band]) => <SeverityBadge key={band} band={band} />)
                      )}
                    </div>
                  </td>
                  <td className="tabular py-2.5 font-semibold" style={{ color: scoreColor(s.security_score) }}>
                    {s.security_score}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(s.scan_id)}
                      disabled={deletingId === s.scan_id}
                      className="rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
                      style={{ borderColor: "var(--border)", color: "var(--status-critical)" }}
                    >
                      {deletingId === s.scan_id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
