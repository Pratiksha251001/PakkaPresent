import { platformSupabase } from "./platformAuth";

export interface PlatformRecoverySummary {
  attempt_id: string;
  access_request_id: string | null;
  invitation_id: string | null;
  institution_id: string | null;
  administrator_user_id: string | null;
  failure_phase: string | null;
  recovery_status: string;
  created_at: string;
  completed_at: string | null;
  total_count: number;
}
export interface PlatformRecoveryDetail extends PlatformRecoverySummary {
  invitation_status: string | null;
  access_request_status: string | null;
  institution_exists: boolean;
  administrator_profile_exists: boolean;
  administrator_role_exists: boolean;
  linkage_valid: boolean;
}
async function authorizationHeader() {
  const { data, error } = await platformSupabase.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error("Platform authentication is required.");
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
  };
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(await authorizationHeader()), ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "Platform recovery operation failed.");
  return body as T;
}
export async function listPlatformRecovery(limit = 25, offset = 0) {
  return request<{ success: true; items: PlatformRecoverySummary[] }>(
    `/api/platform/onboarding-recovery?limit=${limit}&offset=${offset}`,
  );
}
export async function getPlatformRecovery(attemptId: string) {
  return request<{ success: true; recovery: PlatformRecoveryDetail }>(
    `/api/platform/onboarding-recovery/${encodeURIComponent(attemptId)}`,
  );
}
export async function resolvePlatformRecovery(
  attemptId: string,
  notes: string,
) {
  return request<{ success: true; recovery: unknown }>(
    `/api/platform/onboarding-recovery/${encodeURIComponent(attemptId)}/resolve`,
    { method: "POST", body: JSON.stringify({ notes: notes.trim() }) },
  );
}
