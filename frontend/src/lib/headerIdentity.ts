import { UserRoleType } from "./types";

export const PRODUCT_NAME = "PakkaPresent";

const ROLE_LABELS: Record<UserRoleType, string> = {
  admin: "Admin Portal",
  hod: "HOD Portal",
  teacher: "Teacher Portal",
  class_coordinator: "Coordinator Portal",
  student: "Student Portal",
};

const clean = (value?: string | null) => value?.trim() || null;

export interface HeaderIdentityInput {
  institutionName?: string | null;
  institutionLogoPath?: string | null;
  role: UserRoleType | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  rollNumber?: string | null;
}

export interface ResolvedHeaderIdentity {
  productName: string;
  institutionName: string | null;
  institutionLogoPath: string | null;
  roleLabel: string | null;
  contextLabel: string | null;
}

export const resolveHeaderIdentity = ({
  institutionName,
  institutionLogoPath,
  role,
  departmentCode,
  departmentName,
  rollNumber,
}: HeaderIdentityInput): ResolvedHeaderIdentity => ({
  productName: PRODUCT_NAME,
  institutionName: clean(institutionName),
  institutionLogoPath: clean(institutionLogoPath),
  roleLabel: role ? ROLE_LABELS[role] : null,
  contextLabel:
    role === "student"
      ? clean(rollNumber)
      : role && role !== "admin"
        ? clean(departmentCode) || clean(departmentName)
        : null,
});
