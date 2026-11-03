import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldAlert,
  ScrollText,
  Sun,
} from "lucide-react";
import { PakkaPresentLogo } from "../PakkaPresentLogo";
import { signOutPlatform } from "../../lib/platform/platformAuth";
import { setPlatformPath } from "../../lib/platform/platformSessionScope";
import { useTheme } from "../../context/ThemeContext";
const links = [
  { to: "/platform/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/platform/institutions", label: "Institutions", Icon: Building2 },
  {
    to: "/platform/access-requests",
    label: "Access requests",
    Icon: ClipboardCheck,
  },
  { to: "/platform/recovery", label: "Recovery", Icon: ShieldAlert },
  { to: "/platform/audit-log", label: "Audit log", Icon: ScrollText },
];
export const PlatformShell: React.FC = () => {
  const location = useLocation(),
    navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel =
    theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  React.useEffect(
    () => setPlatformPath(location.pathname),
    [location.pathname],
  );
  const active = (to: string) =>
    location.pathname === to ||
    (to !== "/platform/dashboard" && location.pathname.startsWith(`${to}/`));
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-r border-[hsl(var(--sidebar-border))]/35 bg-[hsl(var(--sidebar))] p-4 text-[hsl(var(--sidebar-foreground))] lg:min-h-screen lg:w-72 lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:block">
          <PakkaPresentLogo
            variant="horizontal"
            size="md"
            colorMode={theme === "dark" ? "onDark" : undefined}
          />
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--sidebar-border))]/45 text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-[hsl(var(--sidebar-accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={nextThemeLabel}
              title={nextThemeLabel}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sun className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--sidebar-border))]/45 font-bold text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-[hsl(var(--sidebar-accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={async () => {
                await signOutPlatform();
                navigate("/platform/login", { replace: true });
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:mt-8 lg:block lg:rounded-2xl lg:border lg:border-[hsl(var(--sidebar-border))]/35 lg:bg-[hsl(var(--sidebar-accent))] lg:p-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-primary">
              Platform Administration
            </p>
            <p className="mt-2 text-sm text-[hsl(var(--sidebar-foreground))]/70">
              Super Admin Portal
            </p>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:mt-6 lg:flex-col">
          {links.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 font-bold ${active(to) ? "bg-primary text-[#191a23]" : "border border-[hsl(var(--sidebar-border))]/35 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-6 hidden w-full items-center gap-2 rounded-xl border border-[hsl(var(--sidebar-border))]/35 px-4 py-3 font-bold text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-[hsl(var(--sidebar-accent))] lg:flex"
          onClick={async () => {
            await signOutPlatform();
            navigate("/platform/login", { replace: true });
          }}
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="hidden min-h-16 items-center justify-between border-b bg-card px-8 lg:flex">
          <div>
            <p className="font-bold">PakkaPresent • Platform Administration</p>
            <p className="text-xs text-muted-foreground">
              Super Admin Portal • Controlled operations
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
