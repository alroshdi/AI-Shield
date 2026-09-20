import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/scans", label: "Scans" },
  { to: "/targets", label: "Targets" },
  { to: "/corpus", label: "Attack corpus" },
  { to: "/audit", label: "Audit log" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface-0)" }}>
      <aside
        className="flex w-60 shrink-0 flex-col gap-1 border-r p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <div className="mb-6 flex items-center gap-2 px-1">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--series-1)" }}
          >
            AI
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">AI Shield</div>
            <div className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
              Agent security scanner
            </div>
          </div>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "" : "hover:bg-black/5"
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "color-mix(in srgb, var(--series-1) 14%, transparent)" : "transparent",
              color: isActive ? "var(--series-1)" : "var(--text-secondary)",
            })}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="mt-auto px-1 pt-6 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Defensive security tool. Only scan systems you own or are authorized to test.
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
