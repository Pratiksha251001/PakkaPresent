import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { PakkaPresentLogo } from "../PakkaPresentLogo";
import { signOutPlatform } from "../../lib/platform/platformAuth";
import { setPlatformPath } from "../../lib/platform/platformSessionScope";

export const PlatformShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  React.useEffect(
    () => setPlatformPath(location.pathname),
    [location.pathname],
  );
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-72 border-r bg-[#191a23] p-5 text-white">
        <PakkaPresentLogo variant="horizontal" size="md" colorMode="onDark" />
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-primary">
            Platform Administration
          </p>
          <p className="mt-2 text-sm text-white/70">Super Admin Portal</p>
        </div>
        <nav className="mt-6">
          <Link
            to="/platform/dashboard"
            className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 font-bold text-[#191a23]"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
        </nav>
        <button
          className="mt-6 flex w-full items-center gap-3 rounded-xl border border-white/20 px-4 py-3 text-left font-bold"
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
        <header className="flex h-16 items-center justify-between border-b bg-card px-8">
          <div>
            <p className="font-bold">PakkaPresent • Platform Administration</p>
            <p className="text-xs text-muted-foreground">Super Admin Portal</p>
          </div>
          <ShieldCheck className="h-6 w-6 dashboard-accent-text" />
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
