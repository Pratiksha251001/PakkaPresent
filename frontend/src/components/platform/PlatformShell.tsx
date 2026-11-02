import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { PakkaPresentLogo } from "../PakkaPresentLogo";
import { signOutPlatform } from "../../lib/platform/platformAuth";
import { setPlatformPath } from "../../lib/platform/platformSessionScope";
const links = [
  { to: "/platform/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/platform/institutions", label: "Institutions", Icon: Building2 },
  {
    to: "/platform/access-requests",
    label: "Access requests",
    Icon: ClipboardCheck,
  },
];
export const PlatformShell: React.FC = () => {
  const location = useLocation(),
    navigate = useNavigate();
  React.useEffect(
    () => setPlatformPath(location.pathname),
    [location.pathname],
  );
  const active = (to: string) =>
    location.pathname === to ||
    (to !== "/platform/dashboard" && location.pathname.startsWith(`${to}/`));
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="bg-[#191a23] p-4 text-white lg:min-h-screen lg:w-72 lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:block">
          <PakkaPresentLogo variant="horizontal" size="md" colorMode="onDark" />
          <button
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 px-3 py-2 font-bold lg:hidden"
            onClick={async () => {
              await signOutPlatform();
              navigate("/platform/login", { replace: true });
            }}
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </button>
          <div className="hidden lg:mt-8 lg:block lg:rounded-2xl lg:border lg:border-white/15 lg:bg-white/5 lg:p-4">
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Platform Administration
            </p>
            <p className="mt-2 text-sm text-white/70">Super Admin Portal</p>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:mt-6 lg:flex-col">
          {links.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 font-bold ${active(to) ? "bg-primary text-[#191a23]" : "border border-white/20 text-white hover:bg-white/10"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-6 hidden w-full items-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-bold lg:flex"
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
          <ShieldCheck className="h-6 w-6 dashboard-accent-text" />
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
