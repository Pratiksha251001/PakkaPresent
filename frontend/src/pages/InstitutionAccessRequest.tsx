import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { Select } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { SearchableLocationSelect } from "../components/ui/searchable-location-select";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";
import {
  getIndiaCities,
  getIndiaStates,
  submitInstitutionAccessRequest,
  type InstitutionFieldErrors,
  type LocationOption,
} from "../lib/institutionAccessRequestService";
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
    [error, setError] = useState<string | null>(null),
    [fieldErrors, setFieldErrors] = useState<InstitutionFieldErrors>({}),
    [states, setStates] = useState<LocationOption[]>([]),
    [cities, setCities] = useState<string[]>([]),
    [locationsLoading, setLocationsLoading] = useState(false);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);
  useEffect(() => {
    void getIndiaStates()
      .then(setStates)
      .catch(() => setError("India location options could not be loaded."));
  }, []);
  const setValue = (key: keyof typeof initial, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };
  const update =
    (key: keyof typeof initial) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValue(key, event.target.value);
  const selectState = async (stateCode: string) => {
    const selected = states.find((state) => state.code === stateCode);
    setValue("state", selected?.name || "");
    setValue("city", "");
    setCities([]);
    if (!stateCode) return;
    setLocationsLoading(true);
    try {
      setCities(await getIndiaCities(stateCode));
    } catch {
      setError("Cities could not be loaded for the selected state.");
    } finally {
      setLocationsLoading(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const nextErrors: InstitutionFieldErrors = {};
    if (form.institutionName.trim().length < 2)
      nextErrors.institutionName = "Enter a valid institution name.";
    if (!form.institutionType) nextErrors.institutionType = "Select an institution type.";
    if (form.institutionCode && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(form.institutionCode))
      nextErrors.institutionCode = "Use 2-32 uppercase letters, numbers, hyphens, or underscores.";
    if (form.dteCode && !/^\d{1,32}$/.test(form.dteCode))
      nextErrors.dteCode = "DTE code can contain digits only.";
    if (!form.state) nextErrors.state = "Select a state.";
    if (!form.city) nextErrors.city = "Select a city.";
    if (
      form.studentCount &&
      (!/^\d+$/.test(form.studentCount) ||
        Number(form.studentCount) < 1 ||
        Number(form.studentCount) > 10000000)
    )
      nextErrors.studentCount = "Enter a whole-number count from 1 to 10,000,000.";
    if (!form.contactName.trim()) nextErrors.contactName = "Enter the authorized contact name.";
    if (!form.designation.trim()) nextErrors.designation = "Enter the official designation.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officialEmail.trim()))
      nextErrors.officialEmail = "Enter a valid official email address.";
    if (!/^\d{10}$/.test(form.phone)) nextErrors.phone = "Enter a valid 10-digit phone number.";
    if (form.message.trim().length < 10)
      nextErrors.message = "Enter at least 10 characters about the requirements.";
    if (!form.consent) nextErrors.consent = "Consent is required before submission.";
    setFieldErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      refs.current[first]?.focus();
      refs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setLoading(true);
    try {
      const result = await submitInstitutionAccessRequest(form);
      if (!result.success) {
        setError(result.message);
        setFieldErrors(result.fieldErrors || {});
        return;
      }
      setSuccess(result.message);
      setForm(initial);
    } catch {
      setError("The request could not be submitted. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };
  const field = (label: string, key: keyof typeof initial, required = true, type = "text") => (
    <label className="space-y-1.5 text-xs font-semibold text-foreground/80">
      {label}
      <Input
        ref={(element) => {
          refs.current[key] = element;
        }}
        required={required}
        type={type}
        value={String(form[key])}
        onChange={update(key)}
        disabled={loading}
        aria-invalid={!!fieldErrors[key]}
        aria-describedby={`${key}-error`}
        className="mt-1.5 h-10 rounded-xl"
      />
      {fieldErrors[key] && (
        <span id={`${key}-error`} className="block text-xs font-semibold text-red-600">
          {fieldErrors[key]}
        </span>
      )}
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
              <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-primary">
                Institution access
              </p>
              <h1 className="mt-3 font-display text-3xl font-black">
                Request a verified onboarding invitation
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/75">
                The platform team reviews each institution before issuing a private onboarding link
                and separate code.
              </p>
              <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs leading-6 text-white/70">
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                No password is requested here. The approved institution representative creates the
                first administrator password privately during onboarding.
              </div>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  How verification works
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    {
                      step: "01",
                      title: "Platform review",
                      description:
                        "Institution and representative details are reviewed before approval.",
                    },
                    {
                      step: "02",
                      title: "Private invitation",
                      description:
                        "An approved institution receives a private onboarding link and separate code.",
                    },
                    {
                      step: "03",
                      title: "Secure administrator setup",
                      description:
                        "The authorized representative creates the first administrator account privately.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-3 rounded-2xl border border-white/15 bg-white/[0.03] p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-black text-primary">
                        {item.step}
                      </span>

                      <div>
                        <p className="text-sm font-black text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/65">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
            <form onSubmit={submit} className="space-y-6 bg-card p-6 sm:p-9">
              <div>
                <p className="section-label">Access request</p>
                <h2 className="mt-4 font-display text-2xl font-black">
                  Institution and contact details
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Submitting this form does not create an account. The platform team reviews each
                  request before contacting the authorized representative.
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
                    <Select
                      value={form.institutionType}
                      onValueChange={(value) => setValue("institutionType", value)}
                      disabled={loading}
                      className="mt-1.5"
                      placeholder="Select type"
                      options={[
                        { value: "", label: "Select type" },
                        { value: "College", label: "College" },
                        { value: "University", label: "University" },
                        { value: "School", label: "School" },
                        { value: "Training institute", label: "Training institute" },
                        { value: "Other", label: "Other" },
                      ]}
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    Institution code (optional)
                    <Input
                      ref={(element) => {
                        refs.current.institutionCode = element;
                      }}
                      maxLength={32}
                      placeholder="Example: MITCORER"
                      value={form.institutionCode}
                      onChange={(event) =>
                        setValue(
                          "institutionCode",
                          event.target.value
                            .toUpperCase()
                            .replace(/\s+/g, "_")
                            .replace(/[^A-Z0-9_-]/g, ""),
                        )
                      }
                      aria-invalid={!!fieldErrors.institutionCode}
                      className="mt-1.5 h-10 rounded-xl"
                    />
                    {fieldErrors.institutionCode && (
                      <span className="block text-xs font-semibold text-red-600">
                        {fieldErrors.institutionCode}
                      </span>
                    )}
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    DTE code (optional)
                    <Input
                      ref={(element) => {
                        refs.current.dteCode = element;
                      }}
                      inputMode="numeric"
                      maxLength={32}
                      value={form.dteCode}
                      onChange={(event) =>
                        setValue("dteCode", event.target.value.replace(/\D/g, ""))
                      }
                      className="mt-1.5 h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    Approximate students (optional)
                    <Input
                      ref={(element) => {
                        refs.current.studentCount = element;
                      }}
                      inputMode="numeric"
                      maxLength={8}
                      value={form.studentCount}
                      onChange={(event) =>
                        setValue("studentCount", event.target.value.replace(/\D/g, ""))
                      }
                      className="mt-1.5 h-10 rounded-xl"
                    />
                    {fieldErrors.studentCount && (
                      <span className="block text-xs font-semibold text-red-600">
                        {fieldErrors.studentCount}
                      </span>
                    )}
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    Country
                    <Input value="India" readOnly className="mt-1.5 h-10 rounded-xl bg-muted" />
                  </label>
                  <SearchableLocationSelect
                    label="State"
                    placeholder="Select state"
                    searchPlaceholder="Search states..."
                    emptyMessage="No matching state or union territory."
                    value={states.find((state) => state.name === form.state)?.code || ""}
                    options={states.map((state) => ({
                      value: state.code,
                      label: state.name,
                    }))}
                    onValueChange={(value) => void selectState(value)}
                    error={fieldErrors.state}
                    inputRef={(element) => {
                      refs.current.state = element;
                    }}
                    dataSelector="state"
                  />
                  <SearchableLocationSelect
                    label="City"
                    placeholder={locationsLoading ? "Loading cities..." : "Select city"}
                    searchPlaceholder="Search cities..."
                    emptyMessage="No matching city."
                    value={form.city}
                    options={cities.map((city) => ({ value: city, label: city }))}
                    onValueChange={(value) => setValue("city", value)}
                    disabled={!form.state || locationsLoading}
                    error={fieldErrors.city}
                    inputRef={(element) => {
                      refs.current.city = element;
                    }}
                    dataSelector="city"
                  />
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
                  <label className="space-y-1.5 text-xs font-semibold">
                    Phone number
                    <Input
                      ref={(element) => {
                        refs.current.phone = element;
                      }}
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.phone}
                      onChange={(event) =>
                        setValue("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      aria-invalid={!!fieldErrors.phone}
                      className="mt-1.5 h-10 rounded-xl"
                    />
                    {fieldErrors.phone && (
                      <span className="block text-xs font-semibold text-red-600">
                        {fieldErrors.phone}
                      </span>
                    )}
                  </label>
                </div>
              </section>
              <label className="block text-xs font-semibold">
                Requirements or message
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={form.message}
                  ref={(element) => {
                    refs.current.message = element;
                  }}
                  onChange={update("message")}
                  aria-invalid={!!fieldErrors.message}
                  disabled={loading}
                  rows={5}
                  className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2"
                />
                {fieldErrors.message && (
                  <span className="block text-xs font-semibold text-red-600">
                    {fieldErrors.message}
                  </span>
                )}
              </label>
              <label className="flex items-start gap-3 rounded-xl border p-4 text-xs">
                <Checkbox
                  ref={(element) => {
                    refs.current.consent = element;
                  }}
                  checked={form.consent}
                  disabled={loading}
                  invalid={!!fieldErrors.consent}
                  aria-describedby="consent-error"
                  aria-label="Consent to institution access request contact"
                  onCheckedChange={(checked) => setValue("consent", checked)}
                />
                <span>
                  I am authorized to submit these institution details and consent to being contacted
                  about this request.
                </span>
              </label>
              {fieldErrors.consent && (
                <p id="consent-error" className="text-xs font-semibold text-red-600">
                  {fieldErrors.consent}
                </p>
              )}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-6">
                <CheckCircle2 className="mb-2 h-5 w-5" />
                <strong className="mb-1 block font-black">What happens next?</strong>
                After submission, the platform team will review the institution details and contact
                the authorized representative. Submitting a request does not create an account or
                guarantee approval.
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl font-bold">
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
