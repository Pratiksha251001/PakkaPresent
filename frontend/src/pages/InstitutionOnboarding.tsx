import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/PasswordInput";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";
import { clearLegacySessionKeys } from "../lib/sessionScope";
import {
  onboardInstitution,
  validateInstitutionInvitation,
} from "../lib/institutionOnboardingService";
const initial = {
  officialName: "",
  displayName: "",
  code: "",
  dteCode: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  onboardingCode: "",
};
export const InstitutionOnboarding: React.FC = () => {
  const { signOut: clearExistingSessionBeforeOnboarding } = useAuth();

  const navigate = useNavigate(),
    { invitationToken = "" } = useParams(),
    [form, setForm] = useState(initial),
    [checking, setChecking] = useState(true),
    [valid, setValid] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void validateInstitutionInvitation(invitationToken)
      .then((r) => {
        if (!active) return;
        if (!r.success) {
          setError(r.message || "This invitation is invalid or unavailable.");
          return;
        }
        setValid(true);
        setForm((c) => ({
          ...c,
          officialName: r.institution?.name || "",
          displayName: r.institution?.name || "",
          code: r.institution?.code || "",
          dteCode: r.institution?.dteCode || "",
          email: r.administratorEmail || "",
        }));
      })
      .catch(() => setError("This invitation could not be validated."))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [invitationToken]);
  const update =
    (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((c) => ({ ...c, [k]: e.target.value }));
  const clear = () =>
    setForm((c) => ({
      ...c,
      password: "",
      confirmPassword: "",
      onboardingCode: "",
    }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const r = await onboardInstitution({
        invitationToken,
        onboardingCode: form.onboardingCode,
        institution: {
          officialName: form.officialName,
          displayName: form.displayName,
          code: form.code,
          dteCode: form.dteCode || undefined,
          city: form.city || undefined,
          district: form.district || undefined,
          state: form.state || undefined,
          country: form.country,
        },
        administrator: {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        },
      });
      if (!r.success) {
        clear();
        setError(
          r.recoveryRequired && r.requestId
            ? `${r.message} Recovery ID: ${r.requestId}`
            : r.message || "Institution onboarding failed.",
        );
        return;
      }
      clear();
      await clearExistingSessionBeforeOnboarding();
      clearLegacySessionKeys();
      navigate("/institution/onboarding-complete", {
        replace: true,
        state: {
          registrationComplete: true,
          institutionName: r.institution?.displayName,
          institutionCode: r.institution?.code,
          administratorEmail: form.email,
        },
      });
    } catch {
      clear();
      setError("Institution onboarding is currently unavailable.");
    } finally {
      setLoading(false);
    }
  };
  const field = (l: string, k: keyof typeof initial, required = true) => (
    <label className="space-y-1.5 text-xs font-semibold">
      {l}
      <Input
        required={required}
        value={String(form[k])}
        onChange={update(k)}
        disabled={loading}
        className="mt-1.5 h-10 rounded-xl"
      />
    </label>
  );
  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-10">
      <main className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate("/login/admin")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to admin sign in
        </button>
        <Card className="rounded-[2rem] border-2 p-6 sm:p-9">
          <div className="mb-7 flex gap-4">
            <PakkaPresentLogo variant="icon" size="lg" />
            <div>
              <p className="section-label">Private onboarding</p>
              <h1 className="mt-3 font-display text-3xl font-black">
                Register an institution
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This private invitation is required to create the institution
                and first administrator.
              </p>
            </div>
          </div>
          {checking && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Validating
              invitation...
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
            >
              {error}
            </div>
          )}
          {valid && (
            <form onSubmit={submit} className="space-y-6">
              <section>
                <h2 className="mb-4 flex gap-2 font-display text-xl font-black">
                  <Building2 className="h-5 w-5" /> Institution
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("Official name", "officialName")}
                  {field("Display name", "displayName")}
                  {field("Institution code", "code")}
                  {field("DTE code (optional)", "dteCode", false)}
                  {field("City (optional)", "city", false)}
                  {field("District (optional)", "district", false)}
                  {field("State (optional)", "state", false)}
                  {field("Country", "country")}
                </div>
              </section>
              <section>
                <h2 className="mb-4 font-display text-xl font-black">
                  First administrator
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("Full name", "fullName")}
                  {field("Official email", "email")}
                  <label className="text-xs font-semibold">
                    Password
                    <PasswordInput
                      required
                      minLength={12}
                      value={form.password}
                      onChange={update("password")}
                      className="mt-1.5 h-10 rounded-xl"
                    />
                    <span className="block text-[11px] text-muted-foreground">
                      Use at least 12 characters with uppercase, lowercase,
                      number, symbol, and no spaces.
                    </span>
                  </label>
                  <label className="text-xs font-semibold">
                    Confirm password
                    <PasswordInput
                      required
                      minLength={12}
                      value={form.confirmPassword}
                      onChange={update("confirmPassword")}
                      className="mt-1.5 h-10 rounded-xl"
                    />
                  </label>
                </div>
              </section>
              <label className="block text-xs font-semibold">
                Separate onboarding code
                <PasswordInput
                  required
                  value={form.onboardingCode}
                  onChange={update("onboardingCode")}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </label>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl font-bold"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create institution
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
};
