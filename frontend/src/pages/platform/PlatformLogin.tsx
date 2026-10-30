import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PakkaPresentLogo } from "../../components/PakkaPresentLogo";
import { signInPlatform } from "../../lib/platform/platformAuth";

export const PlatformLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInPlatform(email, password);
      navigate("/platform/dashboard", { replace: true });
    } catch (x) {
      setError(x instanceof Error ? x.message : "Platform sign-in failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] border-2 border-foreground/50 bg-card p-8 shadow-xl">
        <PakkaPresentLogo variant="horizontal" size="md" />
        <div className="mt-8">
          <p className="section-label">Platform Administration</p>
          <h1 className="mt-4 font-display text-3xl font-black">
            Super Admin sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authorized PakkaPresent platform administrators only.
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Platform email"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {busy ? "Verifying..." : "Enter Platform Administration"}
          </Button>
        </form>
        <Link
          to="/"
          className="mt-6 block text-center text-sm font-bold dashboard-accent-text"
        >
          Back to Access Hub
        </Link>
      </div>
    </div>
  );
};
