import React, { useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Loader2,
  Mail,
  UserCog,
  Users,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/PasswordInput";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";
import { AuthVisualBackground } from "../components/AuthVisualBackground";

const roleDetails: Record<
  UserRoleType,
  { title: string; description: string; icon: React.ElementType }
> = {
  admin: {
    title: "Admin Portal",
    description:
      "Sign in to manage institutional settings and global oversight.",
    icon: Shield,
  },
  hod: {
    title: "HOD Portal",
    description: "Sign in to manage your department and review compliance.",
    icon: Building2,
  },
  teacher: {
    title: "Teacher Portal",
    description: "Sign in to record attendance and send parent alerts.",
    icon: Users,
  },
  class_coordinator: {
    title: "Class Teacher Portal",
    description: "Sign in to manage your class and student records.",
    icon: UserCog,
  },
  student: {
    title: "Student Portal",
    description: "Sign in to view your attendance and academic updates.",
    icon: GraduationCap,
  },
};

export const RoleLogin: React.FC = () => {
  const { role: roleParam } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithCredentials } = useAuth();
  const role = roleParam as UserRoleType;
  const details = roleDetails[role];

  const [email, setEmail] = useState(() =>
    role === "admin" ? "pakkapresent@gmail.com" : "",
  );
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!details) {
    return <Navigate to="/" replace />;
  }

  const identifierLabel =
    role === "admin"
      ? "Official Email Address"
      : role === "student"
        ? "Student Roll Number or Email"
        : role === "hod"
          ? "HOD Email or Employee ID"
          : role === "class_coordinator"
            ? "Coordinator Email or Employee ID"
            : "Teacher Email or Employee ID";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await loginWithCredentials(
      role,
      email.trim(),
      password,
      departmentId || undefined,
    );

    setLoading(false);
    if (!result.ok) {
      setError(
        result.message ??
          "Authentication failed. Please check your credentials.",
      );
      return;
    }

    const destination =
      role === "teacher" ? "/teacher/dashboard" : "/dashboard";
    try {
      localStorage.setItem("edutrack_last_active_path", destination);
    } catch {
      // Local storage may be unavailable in private browsing.
    }
    navigate(destination, { replace: true });
  };

  return (
    <div className="auth-pos-page auth-split-page">
      <AuthVisualBackground role={role} />

      {/* Luminous emerald line at top of page like AccessHub */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 right-0 z-20 h-0 overflow-visible"
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/60 dark:via-emerald-400/75 to-transparent shadow-[0_2px_12px_rgba(16,185,129,0.4)]" />
      </div>

      <main className="auth-split__form">
        <Card className="auth-pos-card auth-pos-enter">
          <div className="mb-6 text-center relative z-10">
            <div className="mx-auto mb-3.5 flex items-center justify-center">
              <PakkaPresentLogo
                variant="icon"
                size="lg"
                className="w-16 h-16 sm:w-18 sm:h-18"
              />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight">
              {details.title}
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {details.description}
            </p>
          </div>

          {role === "admin" && location.state?.onboardingComplete && (
            <div
              className="relative z-10 mb-4 rounded-xl border border-emerald-700/30 bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-950/50 dark:text-emerald-100"
              role="status"
            >
              {location.state.institutionName
                ? `${location.state.institutionName} was created successfully. Sign in with the administrator account.`
                : "Institution created successfully. Sign in with the administrator account."}
            </div>
          )}
          {error && (
            <div
              className="mb-4 relative z-10 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs font-semibold text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {role === "hod" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Assigned Department{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Auto-detect department</option>
                  {localDb.departments
                    .filter((department) => department.status === "active")
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                {identifierLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  required
                  className="pl-10 rounded-xl h-10"
                  placeholder={
                    role === "admin"
                      ? "pakkapresent@gmail.com"
                      : role === "student"
                        ? "Roll number or email"
                        : "Enter your ID or email"
                  }
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Password
              </label>
              <PasswordInput
                required
                className="rounded-xl h-10"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-1/3 rounded-xl h-10 text-xs font-semibold border-border hover:bg-muted cursor-pointer"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Go to {details.title}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};
