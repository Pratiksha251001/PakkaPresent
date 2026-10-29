import { apiFetch } from "./api";
export interface InvitationDetails {
  success: boolean;
  message?: string;
  institution?: { name: string; code?: string; dteCode?: string };
  administratorEmail?: string;
  expiresAt?: string;
}
export interface InstitutionOnboardingPayload {
  invitationToken: string;
  onboardingCode: string;
  institution: {
    officialName: string;
    displayName: string;
    code: string;
    dteCode?: string;
    city?: string;
    district?: string;
    state?: string;
    country: string;
  };
  administrator: { fullName: string; email: string; password: string };
}
export interface InstitutionOnboardingResult {
  success: boolean;
  message?: string;
  recoveryRequired?: boolean;
  requestId?: string;
  institution?: { id: string; displayName: string; code: string };
}
export async function validateInstitutionInvitation(
  invitationToken: string,
): Promise<InvitationDetails> {
  const response = await apiFetch(
    `/api/institutions/onboard/${encodeURIComponent(invitationToken)}`,
  );
  const result = await response.json().catch(() => ({}));
  return { ...result, success: response.ok && result.success === true };
}
export async function onboardInstitution(
  payload: InstitutionOnboardingPayload,
): Promise<InstitutionOnboardingResult> {
  const { invitationToken, ...body } = payload;
  const response = await apiFetch(
    `/api/institutions/onboard/${encodeURIComponent(invitationToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json().catch(() => ({}));
  return response.ok
    ? result
    : {
        success: false,
        message:
          result.message || "Institution onboarding could not be completed.",
        recoveryRequired: result.recoveryRequired,
        requestId: result.requestId,
      };
}
