import { api } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { useLanguage } from "../lib/i18n";
import { useApi } from "../lib/useApi";

export function Targets() {
  const { t } = useLanguage();
  const { data: targets, error, loading, reload } = useApi(() => api.listTargets(), []);

  if (loading) return <LoadingBlock label={t("targets.loading")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={t("targets.title")} subtitle={t("targets.subtitle")} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {targets?.map((target) => {
          const authorized = !!target.authorization?.confirmed;
          return (
            <Card key={target.file}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{target.name}</div>
                  <div className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
                    {target.file}
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: authorized ? "var(--status-good)" : "var(--status-critical)",
                    background: `color-mix(in srgb, ${authorized ? "var(--status-good)" : "var(--status-critical)"} 14%, transparent)`,
                  }}
                >
                  {authorized ? t("targets.authorized") : t("targets.notAuthorized")}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("targets.adapter")}: </span>
                  {target.adapter}
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("targets.baseUrl")}: </span>
                  <span className="tabular">{target.base_url}</span>
                </div>
                {target.authorization?.asserted_by && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>{t("targets.assertedBy")}: </span>
                    {target.authorization.asserted_by}
                  </div>
                )}
                {target.authorization?.scope && (
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {target.authorization.scope}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {target.can_apply_fix && (
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--gridline)" }}>
                    {t("targets.applyFixSupported")}
                  </span>
                )}
                {target.supports_indirect_injection && (
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--gridline)" }}>
                    {t("targets.indirectInjectionSupported")}
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
