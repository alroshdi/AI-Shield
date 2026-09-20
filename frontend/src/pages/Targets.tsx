import { api } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { useApi } from "../lib/useApi";

export function Targets() {
  const { data: targets, error, loading, reload } = useApi(() => api.listTargets(), []);

  if (loading) return <LoadingBlock label="Loading targets…" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Targets"
        subtitle="Agents AI Shield is configured to scan. Defined in targets/*.yaml — a scan is refused unless authorization.confirmed is true."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {targets?.map((t) => {
          const authorized = !!t.authorization?.confirmed;
          return (
            <Card key={t.file}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.file}
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: authorized ? "var(--status-good)" : "var(--status-critical)",
                    background: `color-mix(in srgb, ${authorized ? "var(--status-good)" : "var(--status-critical)"} 14%, transparent)`,
                  }}
                >
                  {authorized ? "Authorized" : "Not authorized"}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Adapter: </span>
                  {t.adapter}
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Base URL: </span>
                  <span className="tabular">{t.base_url}</span>
                </div>
                {t.authorization?.asserted_by && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Asserted by: </span>
                    {t.authorization.asserted_by}
                  </div>
                )}
                {t.authorization?.scope && (
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {t.authorization.scope}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {t.can_apply_fix && (
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--gridline)" }}>
                    Apply Fix supported
                  </span>
                )}
                {t.supports_indirect_injection && (
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--gridline)" }}>
                    Indirect injection (V3) supported
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
