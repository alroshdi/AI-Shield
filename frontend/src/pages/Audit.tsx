import { api } from "../api/client";
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { useLanguage } from "../lib/i18n";
import { formatDate } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function Audit() {
  const { t } = useLanguage();
  const { data: entries, error, loading, reload } = useApi(() => api.auditLog(), []);

  if (loading) return <LoadingBlock label={t("audit.loading")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />

      {entries && entries.length === 0 && (
        <Card>
          <EmptyBlock message={t("audit.emptyMessage")} />
        </Card>
      )}

      {entries && entries.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">{t("audit.col.time")}</th>
                <th className="pb-2 font-medium">{t("audit.col.event")}</th>
                <th className="pb-2 font-medium">{t("audit.col.scan")}</th>
                <th className="pb-2 font-medium">{t("audit.col.target")}</th>
                <th className="pb-2 font-medium">{t("audit.col.authorizedBy")}</th>
                <th className="pb-2 font-medium">{t("audit.col.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.scan_id}-${e.timestamp}-${i}`} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(e.timestamp)}
                  </td>
                  <td className="py-2.5 capitalize">{e.event}</td>
                  <td className="tabular py-2.5">{e.scan_id}</td>
                  <td className="py-2.5">{e.target_name}</td>
                  <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>
                    {e.authorized_by}
                  </td>
                  <td className="py-2.5" style={{ color: "var(--text-muted)" }}>
                    {e.event === "rescan" ? `${e.attack_id} → ${e.status}` : `${e.attacks_run} attacks run`}
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
