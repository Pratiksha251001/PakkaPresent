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
export interface InstitutionFieldErrors { [key: string]: string | undefined; }
export interface LocationOption { code: string; name: string; }
export interface InstitutionAccessRequestResult {
  success: boolean;
  message: string;
  fieldErrors?: InstitutionFieldErrors;
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
    fieldErrors: result.fieldErrors,
    message:
      result.message ||
      (response.ok
        ? "Request received."
        : "The request could not be submitted. Please try again."),
  };
}

export async function getIndiaStates(): Promise<LocationOption[]> {
  const response = await apiFetch("/api/locations/india/states");
  if (!response.ok) throw new Error("states unavailable");
  return (await response.json()).states || [];
}
export async function getIndiaCities(stateCode: string): Promise<string[]> {
  const response = await apiFetch(`/api/locations/india/states/${encodeURIComponent(stateCode)}/cities`);
  if (!response.ok) throw new Error("cities unavailable");
  return (await response.json()).cities || [];
}
