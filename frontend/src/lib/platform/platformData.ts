import { platformSupabase } from "./platformAuth";

export type InstitutionStatus = "pending" | "active" | "inactive" | "suspended";
export interface PlatformDashboardMetrics {
  total_institutions: number;
  pending_institutions: number;
  active_institutions: number;
  inactive_institutions: number;
  suspended_institutions: number;
  pending_access_requests: number;
  approved_access_requests: number;
  onboarding_access_requests: number;
  active_invitations: number;
  expired_invitations: number;
  recovery_required_invitations: number;
  recovery_required_attempts: number;
}
export interface PlatformInstitutionSummary {
  institution_id: string;
  official_name: string;
  display_name: string;
  institution_code: string;
  dte_code: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string;
  status: InstitutionStatus;
  logo_configured: boolean;
  admin_count: number;
  created_at: string;
  updated_at: string;
  total_count: number;
}
export interface PlatformInstitutionDetail extends Omit<
  PlatformInstitutionSummary,
  "logo_configured" | "total_count"
> {
  logo_path: string | null;
  logo_updated_at: string | null;
  has_institution_admin: boolean;
  access_request_status: string | null;
  official_email: string | null;
  invitation_status: string | null;
  invitation_expires_at: string | null;
  onboarding_status: string | null;
  onboarding_failure_phase: string | null;
}
const first = <T>(data: unknown): T | null =>
  Array.isArray(data) ? ((data[0] as T | undefined) ?? null) : null;
export async function getPlatformDashboardMetrics(): Promise<PlatformDashboardMetrics> {
  const { data, error } = await platformSupabase.rpc(
    "platform_dashboard_metrics",
  );
  if (error) throw error;
  const row = first<PlatformDashboardMetrics>(data);
  if (!row) throw new Error("Platform metrics are unavailable.");
  return row;
}
export async function listPlatformInstitutions(
  options: {
    search?: string;
    status?: InstitutionStatus | "";
    limit?: number;
    offset?: number;
  } = {},
) {
  const { data, error } = await platformSupabase.rpc(
    "platform_list_institutions",
    {
      search_text: options.search?.trim() || null,
      status_filter: options.status || null,
      page_limit: options.limit ?? 25,
      page_offset: options.offset ?? 0,
    },
  );
  if (error) throw error;
  const rows = (data ?? []) as PlatformInstitutionSummary[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}
export async function getPlatformInstitution(
  id: string,
): Promise<PlatformInstitutionDetail | null> {
  const { data, error } = await platformSupabase.rpc(
    "platform_get_institution",
    { requested_institution_id: id },
  );
  if (error) throw error;
  return first<PlatformInstitutionDetail>(data);
}
