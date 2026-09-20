import { api } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, PageHeader } from "../components/PageState";
import { packLabel } from "../lib/severity";
import { useApi } from "../lib/useApi";

const SEVERITY_PRIOR_COLOR: Record<string, string> = {
  critical: "var(--status-critical)",
  high: "var(--status-serious)",
  medium: "var(--status-warning)",
  low: "var(--status-good)",
};

export function Corpus() {
  const { data: corpus, error, loading, reload } = useApi(() => api.corpus(), []);

  if (loading) return <LoadingBlock label="Loading attack corpus…" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!corpus) return null;

  const total = Object.values(corpus).reduce((sum, attacks) => sum + attacks.length, 0);

  return (
    <>
      <PageHeader
        title="Attack corpus"
        subtitle={`${total} attacks across ${Object.keys(corpus).length} packs — versioned, declarative YAML under ai_shield/corpus/packs.`}
      />

      <div className="flex flex-col gap-4">
        {Object.entries(corpus).map(([pack, attacks]) => (
          <Card key={pack}>
            <div className="mb-3 text-sm font-semibold">
              {packLabel(pack)}{" "}
              <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                ({attacks.length})
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">OWASP</th>
                  <th className="pb-2 font-medium">MITRE ATLAS</th>
                  <th className="pb-2 font-medium">Prior severity</th>
                  <th className="pb-2 font-medium">Turns</th>
                </tr>
              </thead>
              <tbody>
                {attacks.map((a) => (
                  <tr key={a.id} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                    <td className="tabular py-2">{a.id}</td>
                    <td className="py-2">{a.name}</td>
                    <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                      {a.owasp}
                    </td>
                    <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                      {a.mitre_atlas}
                    </td>
                    <td className="py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{
                          color: SEVERITY_PRIOR_COLOR[a.severity_prior] ?? "var(--text-secondary)",
                          background: `color-mix(in srgb, ${SEVERITY_PRIOR_COLOR[a.severity_prior] ?? "var(--text-muted)"} 14%, transparent)`,
                        }}
                      >
                        {a.severity_prior}
                      </span>
                    </td>
                    <td className="tabular py-2">{a.turn_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </>
  );
}
