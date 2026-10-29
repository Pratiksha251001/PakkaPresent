import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";
import { submitInstitutionAccessRequest } from "../lib/institutionAccessRequestService";
const initial = {
  institutionName: "",
  institutionType: "",
  institutionCode: "",
  dteCode: "",
  contactName: "",
  designation: "",
  officialEmail: "",
  phone: "",
  city: "",
  state: "",
  studentCount: "",
  message: "",
  consent: false,
};
export const InstitutionAccessRequest: React.FC = () => {
  const navigate = useNavigate(),
    [form, setForm] = useState(initial),
    [loading, setLoading] = useState(false),
    [success, setSuccess] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const update =
    (key: keyof typeof initial) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await submitInstitutionAccessRequest(form);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setForm(initial);
    } catch {
      setError(
        "The request could not be submitted. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const field = (
    label: string,
    key: keyof typeof initial,
    required = true,
    type = "text",
  ) => (
    <label className="space-y-1.5 text-xs font-semibold text-foreground/80">
      {label}
      <Input
        required={required}
        type={type}
        value={String(form[key])}
        onChange={update(key)}
        disabled={loading}
        className="mt-1.5 h-10 rounded-xl"
      />
    </label>
  );
  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-10 text-foreground">
      <main className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portal selection
        </button>
        <Card className="overflow-hidden rounded-[2rem] border-2 border-foreground/60">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="bg-[#191a23] p-7 text-white sm:p-9">
              <PakkaPresentLogo variant="icon" size="lg" />
              <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-primary">
                Institution access
              </p>
              <h1 className="mt-3 font-display text-3xl font-black">
                Request a verified onboarding invitation
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/75">
                The platform team reviews each institution before issuing a
                private onboarding link and separate code.
              </p>
              <div className="mt-8 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs leading-6 text-white/70">
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                No password is requested here. The approved institution
                representative creates the first administrator password
                privately during onboarding.
              </div>
            </aside>
            <form onSubmit={submit} className="space-y-6 bg-card p-6 sm:p-9">
              <div>
                <p className="section-label">Access request</p>
                <h2 className="mt-4 font-display text-2xl font-black">
                  Institution and contact details
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Submitting this form does not create an account. The platform
                  team reviews each request before contacting the authorized
                  representative.
                </p>
              </div>
              {success && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold"
                >
                  <strong className="block font-black">Request received</strong>
                  {success}
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
                >
                  {error}
                </div>
              )}
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-black">
                  <Building2 className="h-5 w-5" /> Institution
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("Institution name", "institutionName")}
                  <label className="space-y-1.5 text-xs font-semibold">
                    Institution type
                    <select
                      required
                      value={form.institutionType}
                      onChange={update("institutionType")}
                      disabled={loading}
                      className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3"
                    >
                      <option value="">Select type</option>
                      <option>College</option>
                      <option>University</option>
                      <option>School</option>
                      <option>Training institute</option>
                      <option>Other</option>
                    </select>
                  </label>
                  {field(
                    "Institution code (optional)",
                    "institutionCode",
                    false,
                  )}
                  {field("DTE code (optional)", "dteCode", false)}
                  {field("City", "city")}
                  {field("State", "state")}
                  {field(
                    "Approximate students (optional)",
                    "studentCount",
                    false,
                    "number",
                  )}
                </div>
              </section>
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-black">
                  <Mail className="h-5 w-5" /> Authorized contact
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("Full name", "contactName")}
                  {field("Official designation", "designation")}
                  {field("Official email", "officialEmail", true, "email")}
                  {field("Phone number", "phone", true, "tel")}
                </div>
              </section>
              <label className="block text-xs font-semibold">
                Requirements or message
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={form.message}
                  onChange={update("message")}
                  disabled={loading}
                  rows={5}
                  className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2"
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl border p-4 text-xs">
                <input
                  required
                  type="checkbox"
                  checked={form.consent}
                  disabled={loading}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, consent: e.target.checked }))
                  }
                />
                <span>
                  I am authorized to submit these institution details and
                  consent to being contacted about this request.
                </span>
              </label>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-6">
                <CheckCircle2 className="mb-2 h-5 w-5" />
                <strong className="mb-1 block font-black">
                  What happens next?
                </strong>
                After submission, the platform team will review the institution
                details and contact the authorized representative. Submitting a
                request does not create an account or guarantee approval.
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl font-bold"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {loading ? "Submitting request..." : "Submit access request"}
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
};
