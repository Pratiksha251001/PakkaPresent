import React, { useEffect, useState } from "react";
import { Upload, Trash2, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import {
  getInstitutionLogoUrl,
  removeInstitutionLogo,
  uploadInstitutionLogo,
} from "../lib/institutionBrandingService";

interface InstitutionRecord {
  id: string;
  official_name: string | null;
  display_name: string | null;
  code: string | null;
  dte_code: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  status: string | null;
  logo_path: string | null;
  logo_updated_at: string | null;
}
const fields = (record: InstitutionRecord) =>
  [
    ["Official name", record.official_name],
    ["Display name", record.display_name],
    ["Institution code", record.code],
    ["DTE code", record.dte_code],
    [
      "Location",
      [record.city, record.district, record.state, record.country]
        .filter(Boolean)
        .join(", "),
    ],
    ["Status", record.status],
  ] as const;

export const InstitutionSettings: React.FC = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState<InstitutionRecord | null>(null);
  const [institutionDataLoading, setInstitutionDataLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadInstitution = async ({
    showSkeleton,
  }: {
    showSkeleton: boolean;
  }) => {
    if (!user) return;
    if (showSkeleton) setInstitutionDataLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("institutions")
      .select(
        "id,official_name,display_name,code,dte_code,city,district,state,country,status,logo_path,logo_updated_at",
      )
      .eq("id", user.institution_id)
      .single();
    if (error) throw error;
    const next = data as InstitutionRecord;
    setRecord(next);
    setImageReady(false);
    setUrl(
      await getInstitutionLogoUrl(
        next.logo_path,
        next.logo_updated_at
          ? new Date(next.logo_updated_at).getTime()
          : Date.now(),
      ),
    );
    if (showSkeleton) setInstitutionDataLoading(false);
  };
  useEffect(() => {
    loadInstitution({ showSkeleton: true }).catch((error) => {
      setErrorMessage(error.message);
      setInstitutionDataLoading(false);
    });
  }, [user?.institution_id]);
  const initials = (
    record?.display_name ||
    user?.institution_name ||
    "Institution"
  )
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true);
    setErrorMessage("");
    try {
      await uploadInstitutionLogo(user.institution_id, file);
      await loadInstitution({ showSkeleton: false });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  const remove = async () => {
    if (!record || !user) return;
    setBusy(true);
    setErrorMessage("");
    try {
      await removeInstitutionLogo(record.logo_path, user.institution_id);
      await loadInstitution({ showSkeleton: false });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Remove failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Institution Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the official identity and branding for your institution.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5" />
          Institution information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {institutionDataLoading
            ? Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              ))
            : record
              ? fields(record).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      {key}
                    </div>
                    <div
                      className={key === "Status" ? "capitalize" : undefined}
                    >
                      {value || "Not provided"}
                    </div>
                  </div>
                ))
              : null}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          PNG, JPEG, or WebP, up to 2 MB. A square image works best.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-xl font-bold">
            {initials}
            {url && (
              <img
                src={url}
                alt="Institution logo"
                className={`absolute inset-0 h-full w-full bg-white object-contain p-2 transition-opacity ${imageReady ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageReady(true)}
                onError={() => {
                  setImageReady(false);
                  setUrl(null);
                }}
              />
            )}
          </div>
          <label
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <Upload className="h-4 w-4" />
            {busy ? "Working..." : "Upload or replace"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={busy || institutionDataLoading}
              onChange={upload}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={busy || institutionDataLoading || !record?.logo_path}
            onClick={remove}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
        {errorMessage && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};
