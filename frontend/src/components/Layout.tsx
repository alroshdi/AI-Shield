import { NavLink, Outlet } from "react-router-dom";
import { useLanguage } from "../lib/i18n";
import type { TranslationKey } from "../lib/i18n";
import { useTheme } from "../lib/theme";

const NAV: { to: string; key: TranslationKey; end?: boolean }[] = [
  { to: "/", key: "nav.dashboard", end: true },
  { to: "/scans", key: "nav.scans" },
  { to: "/targets", key: "nav.targets" },
  { to: "/corpus", key: "nav.corpus" },
  { to: "/audit", key: "nav.audit" },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface-0)" }}>
      <aside
        className="flex w-60 shrink-0 flex-col gap-1 border-e p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <div className="mb-6 flex items-center gap-2 px-1">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--series-1)" }}
          >
            AI
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight">{t("app.brand")}</div>
            <div className="truncate text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
              {t("app.tagline")}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              onClick={toggleTheme}
              label={theme === "light" ? t("theme.toggleToDark") : t("theme.toggleToLight")}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </IconButton>
          </div>
        </div>

        <div className="mb-2 px-1">
          <button
            onClick={toggleLanguage}
            aria-label={t("language.toggle")}
            title={t("language.toggle")}
            className="flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <GlobeIcon />
            {language === "en" ? "EN / عربي" : "عربي / EN"}
          </button>
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
            {t(item.key)}
          </NavLink>
        ))}

        <div className="mt-auto px-1 pt-6 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("app.footer")}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
