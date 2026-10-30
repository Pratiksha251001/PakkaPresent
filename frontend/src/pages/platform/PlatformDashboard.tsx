import React from "react";
import { Building2, ClipboardCheck, ShieldCheck } from "lucide-react";
export const PlatformDashboard: React.FC = () => (
  <div className="space-y-6">
    <div>
      <p className="section-label">Phase 7A foundation</p>
      <h1 className="mt-3 font-display text-3xl font-black">
        Platform Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        The platform workspace is isolated from every institution workspace.
        Management data and actions will be added in later Phase 7 stages.
      </p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {[
        [
          ShieldCheck,
          "Platform authorization",
          "Explicit super_admin identity",
        ],
        [Building2, "Institution directory", "Coming in Phase 7B"],
        [ClipboardCheck, "Access requests", "Coming in Phase 7C"],
      ].map(([Icon, title, text]) => (
        <div key={title as string} className="rounded-2xl border bg-card p-6">
          <Icon className="h-6 w-6 dashboard-accent-text" />
          <h2 className="mt-4 font-bold">{title as string}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{text as string}</p>
        </div>
      ))}
    </div>
  </div>
);
