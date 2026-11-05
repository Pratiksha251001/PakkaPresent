import { apiUrl } from "../api";
import { platformSupabase } from "./platformAuth";
export interface PlatformAuditEvent {
  event_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  institution_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  safe_metadata: Record<string, unknown>;
  created_at: string;
  total_count: number;
}
async function authHeaders() {
  const { data, error } = await platformSupabase.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error("Platform authentication is required.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}
export async function listPlatformAuditEvents(
  options: {
    action?: string;
    institutionId?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (options.action) query.set("action", options.action);
  if (options.institutionId) query.set("institutionId", options.institutionId);
  query.set("limit", String(options.limit ?? 25));
  query.set("offset", String(options.offset ?? 0));
  const response = await fetch(
    apiUrl(`/api/platform/audit-events?${query}`),
    {
      headers: await authHeaders(),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "Unable to load the platform audit log.");
  const rows = (body.events || []) as PlatformAuditEvent[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}
