import { apiUrl } from "../api";
import { platformSupabase } from "./platformAuth";
export type AccessRequestStatus =
  | "pending"
  | "contacted"
  | "approved"
  | "rejected"
  | "expired"
  | "onboarding"
  | "onboarded";
export interface PlatformAccessRequest {
  request_id: string;
  institution_name: string;
  institution_type: string;
  institution_code: string | null;
  dte_code: string | null;
  contact_name: string;
  designation: string;
  official_email: string;
  phone: string;
  city: string;
  state: string;
  student_count: number | null;
  message?: string;
  status: AccessRequestStatus;
  review_notes?: string | null;
  reviewed_at: string | null;
  created_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  duplicate_count?: number;
  active_invitation_count?: number;
  invitation_id?: string | null;
  invitation_status?: string | null;
  invitation_expires_at?: string | null;
  invitation_created_at?: string | null;
  total_count?: number;
}
export type InvitationEmailStatus =
  | "provider_accepted"
  | "provider_rejected"
  | "unknown"
  | "disabled"
  | "provider_unavailable";
export interface InvitationEmailDelivery {
  status: InvitationEmailStatus;
  recipient: string;
}
export interface InvitationCredential {
  id: string;
  token: string;
  onboardingCode: string;
  expiresAt: string;
  emailDelivery: InvitationEmailDelivery;
}
async function token() {
  const { data } = await platformSupabase.auth.getSession();
  const value = data.session?.access_token;
  if (!value) throw new Error("Platform authentication has expired.");
  return value;
}
async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await token()}`,
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true)
    throw new Error(body.message || "Platform request failed.");
  return body as T;
}
export async function listAccessRequests(
  options: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const q = new URLSearchParams();
  if (options.search) q.set("search", options.search);
  if (options.status) q.set("status", options.status);
  q.set("limit", String(options.limit ?? 25));
  q.set("offset", String(options.offset ?? 0));
  const body = await request<{
    success: true;
    requests: PlatformAccessRequest[];
  }>(`/api/platform/institution-access-requests?${q}`);
  return { rows: body.requests, total: body.requests[0]?.total_count ?? 0 };
}
export function hasActiveInvitation(request: PlatformAccessRequest) {
  return request.active_invitation_count !== undefined
    ? request.active_invitation_count > 0
    : request.invitation_status === "active" &&
        !!request.invitation_expires_at &&
        new Date(request.invitation_expires_at).getTime() > Date.now();
}
export async function getAccessRequest(id: string) {
  const b = await request<{ success: true; request: PlatformAccessRequest }>(
    `/api/platform/institution-access-requests/${id}`,
  );
  return b.request;
}
export async function updateAccessRequest(
  id: string,
  action: "contact" | "reject" | "revoke",
  notes = "",
) {
  await request(`/api/platform/institution-access-requests/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}
export async function issueInvitation(
  id: string,
  action: "approve" | "reissue",
  expiresInHours = 72,
) {
  const b = await request<{ success: true; invitation: InvitationCredential }>(
    `/api/platform/institution-access-requests/${id}/${action}`,
    { method: "POST", body: JSON.stringify({ expiresInHours }) },
  );
  return b.invitation;
}
