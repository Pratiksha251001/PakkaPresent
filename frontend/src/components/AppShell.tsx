import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  FileChartColumnIncreasing,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  UserCog,
  Bell,
  Zap,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PakkaPresentLogo } from "./PakkaPresentLogo";
import { NotificationBell } from "./NotificationBell";
import { Msg91SetupModal } from "./Msg91SetupModal";
import { getSmsGatewayStatus, SmsGatewayStatus } from "../lib/smsService";
import { localDb } from "../lib/supabase";
import {
  getNotificationsForUser,
  getStoredNotifications,
  isNotificationRead,
} from "../lib/notificationService";
import { AppNotification } from "../lib/types";
import { DemoStudyBanner } from "./DemoStudyBanner";
import { HeaderIdentity } from "./HeaderIdentity";
import { resolveHeaderIdentity } from "../lib/headerIdentity";

export const AppShell: React.FC = () => {
  const { user, role, isDemo, openLogoutConfirm } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications(),
  );
  const [smsGatewayModalOpen, setSmsGatewayModalOpen] = useState(false);
  const [smsGatewayStatus, setSmsGatewayStatus] =
    useState<SmsGatewayStatus | null>(null);

  const headerIdentity = React.useMemo(() => {
    const department = user?.department_id
      ? localDb.departments.find((item) => item.id === user.department_id)
      : null;
    const demoDepartmentCode =
      isDemo && user?.department_id === "dept-1" ? "CSE" : null;
    return resolveHeaderIdentity({
      institutionName: user?.institution_name,
      institutionLogoPath: user?.institution_logo_path,
      role,
      departmentCode: department?.code || demoDepartmentCode,
      departmentName: department?.name,
      rollNumber: user?.roll_number,
    });
  }, [
    isDemo,
    role,
    user?.department_id,
    user?.institution_logo_path,
    user?.institution_name,
    user?.roll_number,
  ]);
  const RoleIcon =
    role === "admin"
      ? Shield
      : role === "hod"
        ? Building2
        : role === "class_coordinator"
          ? UserCog
          : role === "student"
            ? GraduationCap
            : Users;

  React.useEffect(() => {
    if (role && role !== "student") {
      getSmsGatewayStatus()
        .then(setSmsGatewayStatus)
        .catch(() => {});
    }
  }, [role]);

  React.useEffect(() => {
    const handleUpdate = () => setNotifications(getStoredNotifications());
    window.addEventListener("edutrack_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(
        "edutrack_notifications_updated",
        handleUpdate,
      );
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const userKey = user?.id || user?.email || role || "anon";
  const userNotifications = React.useMemo(() => {
    if (!role) return [];
    return getNotificationsForUser(user, role, notifications);
  }, [user, role, notifications]);

  const unreadNotifCount = React.useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey))
      .length;
  }, [userNotifications, userKey]);

  const mainNavItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ...(role === "hod"
      ? [
          { label: "Teachers", path: "/hod/teachers", icon: Users },
          { label: "Coordinators", path: "/hod/coordinators", icon: UserCog },
          { label: "Classes", path: "/hod/classes", icon: Building2 },
          { label: "Subjects", path: "/subjects", icon: BookOpen },
          { label: "Students", path: "/hod/students", icon: GraduationCap },
        ]
      : []),
    ...(role === "class_coordinator"
      ? [
          { label: "Students", path: "/cc/students", icon: GraduationCap },
          { label: "Class Subjects", path: "/subjects", icon: BookOpen },
        ]
      : []),
    ...(role !== "admin" && role !== "student"
      ? [
          {
            label:
              role === "hod" ? "Mark Attendance (Lecture)" : "Mark Attendance",
            path: "/attendance",
            icon: ClipboardCheck,
          },
        ]
      : []),
    ...(role === "admin"
      ? [
          { label: "Departments", path: "/departments", icon: Building2 },
          { label: "Teachers", path: "/teachers", icon: Users },
          { label: "Subjects", path: "/subjects", icon: BookOpen },
          { label: "Students", path: "/students", icon: GraduationCap },
          { label: "Users", path: "/users", icon: Users },
          { label: "Notices", path: "/notices", icon: MessageSquare },
        ]
      : []),
    ...(role
      ? [
          {
            label: "Reports & PDF",
            path: "/reports",
            icon: FileChartColumnIncreasing,
          },
        ]
      : []),
    ...(role !== "student"
      ? [{ label: "Parent SMS Logs", path: "/sms-logs", icon: MessageSquare }]
      : []),
  ];

  const bottomNavItems = [
    ...(role === "admin"
      ? [
          {
            label: "Institution Settings",
            path: "/institution/settings",
            icon: Building2,
          },
        ]
      : []),
    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { label: "My Profile", path: "/profile", icon: UserCog },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-2 border-[hsl(var(--sidebar-border))]/35 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-5">
          <PakkaPresentLogo
            size="md"
            variant="horizontal"
            colorMode={theme === "dark" ? "onDark" : undefined}
          />
          <button
            className="lg:hidden text-[hsl(var(--sidebar-foreground))] hover:opacity-80"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className="mx-4 my-3 block shrink-0 rounded-2xl border-2 border-[hsl(var(--sidebar-border))]/35 bg-[hsl(var(--sidebar-accent))] p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-0.5"
          title="View My Profile & Credentials"
        >
          <div className="min-w-0 space-y-1.5">
            <p className="line-clamp-2 text-xs font-semibold leading-4">
              {user?.full_name || "User"}
            </p>
            <p className="truncate text-[10px] text-[hsl(var(--sidebar-foreground))]/70">
              {user?.email}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {isDemo && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                  Demo
                </span>
              )}
              <Badge
                variant="default"
                className={`max-w-full text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "border-[hsl(var(--sidebar-primary))]/30 bg-[hsl(var(--sidebar-primary))]/20 text-[hsl(var(--sidebar-primary))]" : "border-[hsl(var(--dashboard-accent-border))]/55 bg-[hsl(var(--dashboard-accent-soft))] text-[hsl(var(--dashboard-accent))]"}`}
              >
                {role?.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </Link>
        <nav className="flex-1 min-h-0 space-y-2 px-4 py-1 overflow-y-auto overscroll-contain custom-sidebar-scroll">
          {mainNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-semibold shadow-xs"
                    : "text-[hsl(var(--sidebar-foreground))] opacity-85 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-opacity ${
                    active
                      ? "opacity-100 text-[hsl(var(--sidebar-primary-foreground))]"
                      : "opacity-75"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 pb-1">
            <div className="border-t border-[hsl(var(--sidebar-border))]/60 mb-2" />
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--sidebar-foreground))] opacity-50">
              Account & Alerts
            </p>
          </div>

          {bottomNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-semibold shadow-xs"
                    : "text-[hsl(var(--sidebar-foreground))] opacity-85 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-opacity ${
                    active
                      ? "opacity-100 text-[hsl(var(--sidebar-primary-foreground))]"
                      : "opacity-75"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
                {Boolean(item.badge) && (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-2xs ${
                      active
                        ? "bg-white text-primary"
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 mr-2" />
            ) : (
              <Sun className="h-4 w-4 mr-2" />
            )}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </Button>
          <Button
            id="sidebar-logout-btn"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMobileOpen(false);
              openLogoutConfirm();
            }}
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20 font-medium transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden lg:ml-72">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b-2 border-foreground/25 bg-card px-4 shadow-[0_3px_0_0_hsl(var(--foreground)/0.08)] lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <HeaderIdentity identity={headerIdentity} compact />
          </div>
          <div className="flex items-center gap-2">
            {role && role !== "student" && (
              <button
                type="button"
                onClick={() => setSmsGatewayModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                title="SMS Gateway Setup & Status"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Gateway</span>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    smsGatewayStatus?.isConfigured
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
              </button>
            )}
            <NotificationBell />
            <Link
              to="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card dashboard-accent-text hover:bg-muted/80 transition-colors"
              title="View Profile"
            >
              <RoleIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Desktop Header Topbar */}
        <header className="hidden lg:flex h-16 items-center justify-between border-b-2 border-foreground/25 bg-card/95 px-8 backdrop-blur-md sticky top-0 z-50">
          <div className="flex min-w-0 items-center gap-3">
            <HeaderIdentity identity={headerIdentity} />
          </div>

          <div className="flex items-center gap-3">
            {role && role !== "student" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSmsGatewayModalOpen(true)}
                className="h-9 px-3 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold gap-1.5 shadow-2xs transition-colors"
                title="SMS Gateway Setup & Status"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>SMS Gateway</span>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    smsGatewayStatus?.isConfigured
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
              </Button>
            )}
            <NotificationBell />
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground hover:bg-muted/80 transition-colors"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-1.5 hover:bg-muted/60 hover:border-[hsl(var(--dashboard-accent-border))]/60 transition-colors shadow-2xs"
              title="View Profile"
            >
              <div className="dashboard-profile-icon flex h-7 w-7 items-center justify-center rounded-lg">
                <RoleIcon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-foreground max-w-36 truncate">
                {user?.full_name || "Profile"}
              </span>
            </Link>
          </div>
        </header>

        {/* Demo / Study Mode Banner */}
        <DemoStudyBanner />

        <main className="app-dashboard-canvas flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {role && role !== "student" && (
        <Msg91SetupModal
          open={smsGatewayModalOpen}
          onOpenChange={(open) => {
            setSmsGatewayModalOpen(open);
            if (!open) {
              getSmsGatewayStatus()
                .then(setSmsGatewayStatus)
                .catch(() => {});
            }
          }}
          onTestSent={() => {
            getSmsGatewayStatus()
              .then(setSmsGatewayStatus)
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
};
