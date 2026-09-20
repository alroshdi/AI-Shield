import { api } from "../api/client";
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { formatDate } from "../lib/severity";
import { useApi } from "../lib/useApi";

export function Audit() {
  const { data: entries, error, loading, reload } = useApi(() => api.auditLog(), []);

  if (loading) return <LoadingBlock label="Loading audit log…" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every scan and rescan the engine has run — who, what target, when. Append-only (ai_shield/audit.py)."
      />

      {entries && entries.length === 0 && (
        <Card>
          <EmptyBlock message="No audit entries yet — they're written the moment a scan or rescan runs." />
        </Card>
      )}

      {entries && entries.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Scan</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium">Authorized by</th>
                <th className="pb-2 font-medium">Detail</th>
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
