import React from "react";
import {
  Building2,
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { UserRoleType } from "../lib/types";
import { PakkaPresentLogo } from "./PakkaPresentLogo";

interface AuthVisualBackgroundProps {
  role: UserRoleType;
}

const roleVisuals: Record<
  UserRoleType,
  {
    eyebrow: string;
    title: string;
    supporting: string;
    icon: React.ElementType;
  }
> = {
  admin: {
    eyebrow: "Institutional governance",
    title: "One secure view of academic operations",
    supporting:
      "Coordinate people, records, attendance, and reporting from a role-aware workspace.",
    icon: ShieldCheck,
  },
  hod: {
    eyebrow: "Department oversight",
    title: "Attendance health at department level",
    supporting:
      "Review assigned classes, staff activity, and academic follow-up without leaving the department context.",
    icon: Building2,
  },
  teacher: {
    eyebrow: "Faculty workflow",
    title: "Capture attendance and follow up quickly",
    supporting:
      "Move from class attendance to parent communication through one focused faculty workflow.",
    icon: Users,
  },
  class_coordinator: {
    eyebrow: "Class coordination",
    title: "Keep class records and follow-up connected",
    supporting:
      "Review student records, attendance patterns, and class-level actions in one place.",
    icon: UserCog,
  },
  student: {
    eyebrow: "Student self-service",
    title: "Your attendance, records, and notices",
    supporting:
      "Use a clear personal workspace for attendance summaries and academic updates.",
    icon: GraduationCap,
  },
};

export const AuthVisualBackground: React.FC<AuthVisualBackgroundProps> = ({
  role,
}) => {
  const visual = roleVisuals[role];
  const RoleIcon = visual.icon;

  return (
    <aside className="auth-cover" aria-label={`${visual.eyebrow} overview`}>
      <div className="auth-cover__grid" aria-hidden="true" />
      <div
        className="auth-cover__orb auth-cover__orb--top"
        aria-hidden="true"
      />
      <div
        className="auth-cover__orb auth-cover__orb--bottom"
        aria-hidden="true"
      />

      <div className="auth-cover__inner">
        <PakkaPresentLogo
          variant="horizontal"
          size="lg"
          showTagline
          colorMode="onDark"
          className="auth-cover__brand"
        />

        <div className="auth-cover__copy">
          <p className="auth-cover__eyebrow">
            <RoleIcon />
            {visual.eyebrow}
          </p>
          <h2>{visual.title}</h2>
          <p>{visual.supporting}</p>
        </div>

        <p className="auth-cover__footnote">
          <ClipboardCheck /> Attendance, communication, and records in one
          accountable workflow.
        </p>
      </div>
    </aside>
  );
};
