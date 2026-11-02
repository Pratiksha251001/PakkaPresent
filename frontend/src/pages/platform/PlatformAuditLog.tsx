import React from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  listPlatformAuditEvents,
  PlatformAuditEvent,
} from "../../lib/platform/platformAudit";
export const PlatformAuditLog: React.FC = () => {
  const [action, setAction] = React.useState(""),
    [institutionId, setInstitutionId] = React.useState(""),
    [page, setPage] = React.useState(0),
    [rows, setRows] = React.useState<PlatformAuditEvent[]>([]),
    [total, setTotal] = React.useState(0),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState("");
  const limit = 25;
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listPlatformAuditEvents({
        action: action.trim(),
        institutionId: institutionId.trim(),
        limit,
        offset: page * limit,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load the platform audit log.",
      );
    } finally {
      setLoading(false);
    }
  }, [action, institutionId, page]);
  React.useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Immutable platform evidence</p>
          <h1 className="mt-3 font-display text-3xl font-black">Audit log</h1>
          <p className="mt-2 text-muted-foreground">
            Review security-sensitive platform operations without exposing
            invitation credentials or authentication secrets.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          placeholder="Exact action, for example institution_status_transition"
        />
        <Input
          value={institutionId}
          onChange={(e) => {
            setInstitutionId(e.target.value);
            setPage(0);
          }}
          placeholder="Institution UUID (optional)"
        />
      </div>
      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 font-bold text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : error ? null : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ScrollText className="mx-auto h-10 w-10" />
            <p className="mt-4 font-bold">No audit events found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {rows.map((row) => (
              <Card key={row.event_id}>
                <CardHeader>
                  <CardTitle className="text-base">{row.action}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <b>Created:</b> {new Date(row.created_at).toLocaleString()}
                  </p>
                  <p>
                    <b>Actor:</b> {row.actor_user_id || "System service"}
                  </p>
                  <p>
                    <b>Target:</b> {row.target_type} {row.target_id || ""}
                  </p>
                  <p>
                    <b>Institution:</b> {row.institution_id || "Not applicable"}
                  </p>
                  <details className="md:col-span-2">
                    <summary className="cursor-pointer font-bold">
                      Safe state details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(
                        {
                          previous: row.previous_state,
                          next: row.new_state,
                          metadata: row.safe_metadata,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              variant="outline"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
