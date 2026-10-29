import { apiFetch } from "./api";
export interface InstitutionAccessRequestPayload {
  institutionName: string;
  institutionType: string;
  institutionCode?: string;
  dteCode?: string;
  contactName: string;
  designation: string;
  officialEmail: string;
  phone: string;
  city: string;
  state: string;
  studentCount?: string;
  message: string;
  consent: boolean;
}
export interface InstitutionAccessRequestResult {
  success: boolean;
  message: string;
}
export async function submitInstitutionAccessRequest(
  payload: InstitutionAccessRequestPayload,
): Promise<InstitutionAccessRequestResult> {
  const response = await apiFetch("/api/institutions/access-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  return {
    success: response.ok && result.success === true,
    message:
      result.message ||
      (response.ok
        ? "Request received."
        : "The request could not be submitted. Please try again."),
  };
}
