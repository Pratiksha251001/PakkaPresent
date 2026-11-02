import React from "react";
import {
  ClipboardCheck,
  Copy,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  getAccessRequest,
  hasActiveInvitation,
  issueInvitation,
  listAccessRequests,
  PlatformAccessRequest,
  InvitationCredential,
  updateAccessRequest,
} from "../../lib/platform/platformAccessRequests";
const tone = (s: string) =>
  s === "rejected"
    ? "destructive"
    : s === "approved" || s === "onboarded"
      ? "success"
      : s === "pending"
        ? "secondary"
        : "outline";
export const PlatformAccessRequests: React.FC = () => {
  const [search, setSearch] = React.useState(""),
    [query, setQuery] = React.useState(""),
    [status, setStatus] = React.useState(""),
    [page, setPage] = React.useState(0),
    [rows, setRows] = React.useState<PlatformAccessRequest[]>([]),
    [total, setTotal] = React.useState(0),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(""),
    [selected, setSelected] = React.useState<PlatformAccessRequest | null>(
      null,
    ),
    [busy, setBusy] = React.useState(""),
    [notes, setNotes] = React.useState(""),
    [credential, setCredential] = React.useState<InvitationCredential | null>(
      null,
    );
  const limit = 25;
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await listAccessRequests({
        search: query,
        status,
        limit,
        offset: page * limit,
      });
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const open = async (id: string) => {
    setError("");
    try {
      setSelected(await getAccessRequest(id));
      setNotes("");
      setCredential(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load request.");
    }
  };
  const act = async (
    action: "contact" | "reject" | "revoke" | "approve" | "reissue",
  ) => {
    if (!selected) return;
    setBusy(action);
    try {
      if (action === "approve" || action === "reissue")
        setCredential(await issueInvitation(selected.request_id, action));
      else await updateAccessRequest(selected.request_id, action, notes);
      setSelected(await getAccessRequest(selected.request_id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Platform operations</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            Access requests
          </h1>
          <p className="mt-2 text-muted-foreground">
            Review institution requests and issue private onboarding
            invitations.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_220px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Institution, contact, email, city or code"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "contacted", label: "Contacted" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "expired", label: "Expired" },
            { value: "onboarding", label: "Onboarding" },
            { value: "onboarded", label: "Onboarded" },
          ]}
        />
        <Button>Search</Button>
      </form>
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-destructive font-bold">
            {error}
          </CardContent>
        </Card>
      )}
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      ) : error ? null : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10" />
            <h2 className="mt-4 font-bold">No access requests found</h2>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? "" : "s"}
          </p>
          <div className="grid gap-3">
            {rows.map((r) => (
              <Card key={r.request_id}>
                <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{r.institution_name}</h2>
                      <Badge variant={tone(r.status)}>{r.status}</Badge>
                      {(r.duplicate_count ?? 0) > 0 && (
                        <Badge variant="destructive">
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          Possible duplicate
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.contact_name} · {r.official_email} · {r.city},{" "}
                      {r.state}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void open(r.request_id)}
                  >
                    Review
                  </Button>
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
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) {
            setSelected(null);
            setCredential(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.institution_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Request review and onboarding controls
            </p>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {[
                  ["Status", selected.status],
                  ["Contact", selected.contact_name],
                  ["Designation", selected.designation],
                  ["Email", selected.official_email],
                  ["Phone", selected.phone],
                  ["Location", `${selected.city}, ${selected.state}`],
                  [
                    "Institution code",
                    selected.institution_code || "Not provided",
                  ],
                  ["DTE code", selected.dte_code || "Not provided"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      {a}
                    </p>
                    <p className="mt-1 break-words">{b}</p>
                  </div>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request message</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm">
                  {selected.message || "No message provided."}
                </CardContent>
              </Card>
              <label className="block text-xs font-bold">
                Review notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
                />
              </label>
              {credential && (
                <div
                  role="status"
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
                >
                  <p className="font-black">Copy these credentials now</p>
                  <p className="mt-1 text-xs">
                    They are returned once and are not stored as plaintext.
                  </p>
                  <div className="mt-3 space-y-2 font-mono text-xs">
                    <p className="break-all">Token: {credential.token}</p>
                    <p>Code: {credential.onboardingCode}</p>
                    <p>
                      Expires: {new Date(credential.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(`${location.origin}/institution/onboard/${credential.token}
Code: ${credential.onboardingCode}`)
                    }
                  >
                    <Copy className="h-4 w-4" />
                    Copy invitation
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap">
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => void act("contact")}
            >
              Mark contacted
            </Button>
            <Button
              variant="destructive"
              disabled={!!busy || !notes.trim()}
              onClick={() => void act("reject")}
            >
              Reject
            </Button>
            {selected && hasActiveInvitation(selected) && (
              <Button
                variant="destructive"
                disabled={!!busy}
                onClick={() => void act("revoke")}
              >
                Revoke invite
              </Button>
            )}
            <Button
              disabled={!!busy}
              onClick={() =>
                void act(
                  selected && hasActiveInvitation(selected)
                    ? "reissue"
                    : "approve",
                )
              }
            >
              {selected && hasActiveInvitation(selected)
                ? "Reissue invitation"
                : "Approve and issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
