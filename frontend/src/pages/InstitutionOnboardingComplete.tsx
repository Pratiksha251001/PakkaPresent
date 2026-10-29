import React from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";

interface CompletionState {
  registrationComplete?: boolean;
  institutionName?: string;
  institutionCode?: string;
  administratorEmail?: string;
}

export const InstitutionOnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as CompletionState;

  React.useEffect(() => {
    if (!state.registrationComplete)
      navigate("/login/admin", { replace: true });
  }, [navigate, state.registrationComplete]);

  if (!state.registrationComplete) return null;

  const continueToLogin = () => {
    navigate("/login/admin", {
      replace: true,
      state: {
        onboardingComplete: true,
        institutionName: state.institutionName,
      },
    });
  };

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-10 text-foreground">
      <main className="mx-auto max-w-2xl">
        <Card className="rounded-[2rem] border-2 border-foreground/60 p-7 text-center shadow-[0_6px_0_0_hsl(var(--foreground)/0.16)] sm:p-10">
          <div className="mx-auto flex w-fit items-center gap-4">
            <PakkaPresentLogo variant="icon" size="lg" />
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <p className="section-label mt-8">Onboarding complete</p>
          <h1 className="mt-4 font-display text-3xl font-black">
            Registration complete
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Your institution and administrator account have been created
            successfully. You can now sign in to the Admin Portal.
          </p>
          <div className="mx-auto mt-7 max-w-lg space-y-3 rounded-2xl border border-border/70 bg-secondary/50 p-5 text-left text-sm">
            <p>
              <strong>Institution:</strong>{" "}
              {state.institutionName || "Registered institution"}
            </p>
            {state.institutionCode && (
              <p>
                <strong>Institution code:</strong> {state.institutionCode}
              </p>
            )}
            {state.administratorEmail && (
              <p>
                <strong>Administrator email:</strong> {state.administratorEmail}
              </p>
            )}
          </div>
          <div className="mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left text-xs leading-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <span>
              The private invitation has been consumed. Password and onboarding
              credentials are no longer retained by this page.
            </span>
          </div>
          <Button
            onClick={continueToLogin}
            className="mt-8 h-11 w-full rounded-xl font-bold"
          >
            Continue to Admin login <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </main>
    </div>
  );
};
