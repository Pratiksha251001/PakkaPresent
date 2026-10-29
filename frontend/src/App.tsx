import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppShell } from "./components/AppShell";

import { LandingAuth } from "./pages/LandingAuth";
import { AccessHub } from "./pages/AccessHub";
import { Dashboard } from "./pages/Dashboard";
import { Attendance } from "./pages/Attendance";
import { Departments } from "./pages/Departments";
import { Teachers } from "./pages/Teachers";
import { Subjects } from "./pages/Subjects";
import { Students } from "./pages/Students";
import { Reports } from "./pages/Reports";
import { SmsLogs } from "./pages/SmsLogs";
import { HODDashboard } from "./pages/HODDashboard";
import { ClassCoordinatorDashboard } from "./pages/ClassCoordinatorDashboard";
import { Users } from "./pages/Users";
import { Notices } from "./pages/Notices";
import { StudentDashboard } from "./pages/StudentDashboard";
import { StudentProfile } from "./pages/StudentProfile";
import { UserProfile } from "./pages/UserProfile";
import { HODStaff } from "./pages/HODStaff";
import { HODClasses } from "./pages/HODClasses";
import { HODStudents } from "./pages/HODStudents";
import { ClassTeacherLogin } from "./pages/ClassTeacherLogin";
import { RoleLogin } from "./pages/RoleLogin";
import { InstitutionOnboarding } from "./pages/InstitutionOnboarding";
import { InstitutionOnboardingComplete } from "./pages/InstitutionOnboardingComplete";
import { InstitutionAccessRequest } from "./pages/InstitutionAccessRequest";
import { ClassTeacherDashboard } from "./pages/ClassTeacherDashboard";
import { Notifications } from "./pages/Notifications";
import { ForcePasswordChangeModal } from "./components/ForcePasswordChangeModal";
import { LogoutConfirmDialog } from "./components/LogoutConfirmDialog";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  denyAdmin?: boolean;
  denyHod?: boolean;
  denyStudent?: boolean;
  studentOnly?: boolean;
  roleOnly?: "hod" | "admin" | "teacher" | "class_coordinator" | "student";
}> = ({
  children,
  adminOnly = false,
  denyAdmin = false,
  denyHod = false,
  denyStudent = false,
  studentOnly = false,
  roleOnly,
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="app-startup-spinner h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyAdmin && role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyHod && role === "hod") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyStudent && role === "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (studentOnly && role !== "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (roleOnly && role !== roleOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RoleDashboard: React.FC = () => {
  const { role } = useAuth();

  if (role === "hod") return <HODDashboard />;
  if (role === "class_coordinator") return <ClassCoordinatorDashboard />;
  if (role === "student") return <StudentDashboard />;
  if (role === "teacher") return <ClassTeacherDashboard />;
  return <Dashboard />;
};

const LAST_PATH_KEY = "edutrack_last_active_path";
const LEGACY_LAST_PATH_KEY = "smit_last_active_path";
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/teacher/login",
  "/institution/onboard",
  "/institution/onboarding-complete",
  "/institution/request-access",
];

const isRestorableAppPath = (path: string | null): path is string => {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (pathname === "/") return false;
  return !PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

const RoutePathTracker: React.FC = () => {
  const location = useLocation();
  const { user, role } = useAuth();

  React.useEffect(() => {
    const fullPath = location.pathname + location.search + location.hash;
    if (user && role && isRestorableAppPath(fullPath)) {
      try {
        localStorage.setItem(LAST_PATH_KEY, fullPath);
        localStorage.setItem(LEGACY_LAST_PATH_KEY, fullPath);
      } catch (e) {
        console.warn("Failed to persist last active path", e);
      }
    }
  }, [location, user, role]);

  return null;
};

const RootRouteHandler: React.FC = () => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="app-startup-spinner h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  // If query param ?switch=true is explicitly present, allow user to view AccessHub to pick another portal
  const isSwitching =
    new URLSearchParams(location.search).get("switch") === "true";

  if (user && role && !isSwitching) {
    const savedPath =
      localStorage.getItem(LAST_PATH_KEY) ||
      localStorage.getItem(LEGACY_LAST_PATH_KEY);
    const defaultDashboard =
      role === "teacher" ? "/teacher/dashboard" : "/dashboard";
    const targetPath = isRestorableAppPath(savedPath)
      ? savedPath
      : defaultDashboard;
    if (savedPath && targetPath === defaultDashboard) {
      localStorage.removeItem(LAST_PATH_KEY);
      localStorage.removeItem(LEGACY_LAST_PATH_KEY);
    }

    return <Navigate to={targetPath} replace />;
  }

  return <AccessHub />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RoutePathTracker />
          <ForcePasswordChangeModal />
          <LogoutConfirmDialog />
          <Routes>
            <Route path="/" element={<RootRouteHandler />} />
            <Route path="/teacher/login" element={<ClassTeacherLogin />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/login/:role" element={<RoleLogin />} />
            <Route
              path="/institution/request-access"
              element={<InstitutionAccessRequest />}
            />
            <Route
              path="/institution/onboard/:invitationToken"
              element={<InstitutionOnboarding />}
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute roleOnly="teacher">
                    <ClassTeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/teachers"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStaff mode="teachers" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/coordinators"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStaff mode="coordinators" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/classes"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODClasses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/students"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cc/students"
                element={
                  <ProtectedRoute roleOnly="class_coordinator">
                    <ClassCoordinatorDashboard studentsOnly />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute denyAdmin denyStudent>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute adminOnly>
                    <Departments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute adminOnly>
                    <Teachers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects"
                element={
                  <ProtectedRoute denyStudent>
                    <Subjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <ProtectedRoute adminOnly>
                    <Students />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute adminOnly>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notices"
                element={
                  <ProtectedRoute adminOnly>
                    <Notices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sms-logs"
                element={
                  <ProtectedRoute denyStudent>
                    <SmsLogs />
                  </ProtectedRoute>
                }
              />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route
                path="/student/profile"
                element={<Navigate to="/profile" replace />}
              />
              <Route
                path="/coordinator/dashboard"
                element={
                  <ProtectedRoute roleOnly="class_coordinator">
                    <ClassCoordinatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cc/dashboard"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/coordinator"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/cc"
                element={<Navigate to="/dashboard" replace />}
              />
            </Route>
            <Route
              path="/institution/onboarding-complete"
              element={<InstitutionOnboardingComplete />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
