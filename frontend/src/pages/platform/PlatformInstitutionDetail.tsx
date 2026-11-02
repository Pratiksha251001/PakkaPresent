import React from "react";
import { ArrowLeft, Building2, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  getPlatformInstitution,
  PlatformInstitutionDetail,
} from "../../lib/platform/platformData";
export const PlatformInstitutionDetailPage: React.FC = () => {
  const { institutionId = "" } = useParams(),
    [data, setData] = React.useState<PlatformInstitutionDetail | null>(null),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getPlatformInstitution(institutionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institution.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);
  React.useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
  if (error)
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="font-bold text-destructive">{error}</p>
          <Button className="mt-3" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  if (!data)
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-10 w-10" />
          <h1 className="mt-4 font-bold">Institution not found</h1>
          <Link
            to="/platform/institutions"
            className="mt-4 inline-block underline"
          >
            Back to institutions
          </Link>
        </CardContent>
      </Card>
    );
  const items = [
    ["Official name", data.official_name],
    ["Institution code", data.institution_code],
    ["DTE code", data.dte_code],
    [
      "Location",
      [data.city, data.district, data.state, data.country]
        .filter(Boolean)
        .join(", "),
    ],
    ["Official email", data.official_email],
    ["Institution admins", String(data.admin_count)],
    ["Branding", data.logo_path ? "Logo configured" : "No logo configured"],
    ["Access request", data.access_request_status],
    ["Invitation", data.invitation_status],
    ["Onboarding", data.onboarding_status],
    ["Failure phase", data.onboarding_failure_phase],
    ["Created", new Date(data.created_at).toLocaleString()],
  ];
  return (
    <div className="space-y-6">
      <Link
        to="/platform/institutions"
        className="inline-flex items-center gap-2 font-bold underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to institutions
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Read-only institution detail</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            {data.display_name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Operational identity, administration coverage, and onboarding
            provenance.
          </p>
        </div>
        <Badge
          variant={
            data.status === "active"
              ? "success"
              : data.status === "suspended"
                ? "destructive"
                : "outline"
          }
        >
          {data.status}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Institution information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 break-words font-medium">
                {value || "Not available"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
