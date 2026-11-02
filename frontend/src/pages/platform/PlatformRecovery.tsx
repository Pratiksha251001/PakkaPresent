import React from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  getPlatformRecovery,
  listPlatformRecovery,
  PlatformRecoveryDetail,
  PlatformRecoverySummary,
  resolvePlatformRecovery,
} from "../../lib/platform/platformRecovery";

export const PlatformRecovery: React.FC = () => {
  const [items, setItems] = React.useState<PlatformRecoverySummary[]>([]),
    [selected, setSelected] = React.useState<PlatformRecoveryDetail | null>(
      null,
    ),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(""),
    [notes, setNotes] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [success, setSuccess] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems((await listPlatformRecovery()).items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load recovery queue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void load();
  }, [load]);
  const inspect = async (id: string) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      setSelected((await getPlatformRecovery(id)).recovery);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to inspect recovery attempt.",
      );
    } finally {
      setBusy(false);
    }
  };
  const resolve = async () => {
    if (!selected) return;
    if (notes.trim().length < 5) {
      setError("Enter recovery notes containing at least 5 characters.");
      return;
    }
    if (
      !selected.linkage_valid ||
      selected.institution_exists ||
      selected.administrator_profile_exists ||
      selected.administrator_role_exists
    ) {
      setError(
        "This recovery is not clean and cannot be resolved automatically.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await resolvePlatformRecovery(selected.attempt_id, notes);
      setSelected(null);
      setNotes("");
      setSuccess("Recovery resolved and onboarding access restored.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery resolution failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Guarded onboarding operations</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            Onboarding recovery
          </h1>
          <p className="mt-2 text-muted-foreground">
            Inspect linked artifacts and resolve only clean recovery cases.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading || busy}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>
      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 font-bold text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}
      {success ? (
        <Card>
          <CardContent className="pt-6 font-bold text-emerald-700">
            {success}
          </CardContent>
        </Card>
      ) : null}
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10" />
            <p className="mt-4 font-bold">
              No recovery-required onboarding attempts
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.attempt_id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Attempt {item.attempt_id}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <p>
                    Failure phase:{" "}
                    <b>{item.failure_phase || "Not available"}</b>
                  </p>
                  <p>
                    Recovery status: <b>{item.recovery_status}</b>
                  </p>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => void inspect(item.attempt_id)}
                >
                  Inspect recovery
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>Recovery diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                Linkage valid: <b>{selected.linkage_valid ? "Yes" : "No"}</b>
              </p>
              <p>
                Invitation: <b>{selected.invitation_status || "Missing"}</b>
              </p>
              <p>
                Access request:{" "}
                <b>{selected.access_request_status || "Missing"}</b>
              </p>
              <p>
                Institution remains:{" "}
                <b>{selected.institution_exists ? "Yes" : "No"}</b>
              </p>
              <p>
                Admin profile remains:{" "}
                <b>{selected.administrator_profile_exists ? "Yes" : "No"}</b>
              </p>
              <p>
                Admin role remains:{" "}
                <b>{selected.administrator_role_exists ? "Yes" : "No"}</b>
              </p>
            </div>
            <label className="block text-sm font-bold" htmlFor="recovery-notes">
              Required recovery notes
            </label>
            <textarea
              id="recovery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className="min-h-24 w-full rounded-lg border bg-background p-3"
            />
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void resolve()}>
                Resolve clean recovery
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setNotes("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
