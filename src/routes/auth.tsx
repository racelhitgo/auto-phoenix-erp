import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/common";
import { GoogleButton } from "@/components/app/GoogleButton";
import { Wordmark } from "@/components/app/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Auto Phoenix" },
      { name: "description", content: "Sign in to the Auto Phoenix staff portal." },
      { property: "og:title", content: "Sign in — Auto Phoenix" },
      { property: "og:description", content: "Sign in to the Auto Phoenix staff portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "forgot" | "setup" | "check-email";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  const init = useQuery({
    queryKey: ["app-initialized"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("app_is_initialized");
      if (error) throw error;
      return data as boolean;
    },
  });

  useEffect(() => {
    if (init.data === false) setMode("setup");
  }, [init.data]);

  // Already signed in (or just returned from Google): go to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    navigate({ to: "/dashboard", replace: true });
  }

  async function setupAdmin(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (password.length < 8) return void toast.error("Use at least 8 characters for the password.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: fullName.trim() } },
    });
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    if (data.session) return void navigate({ to: "/dashboard", replace: true });
    setSentMessage(`We sent a confirmation link to ${email.trim()}. Open it to activate your Admin account.`);
    setMode("check-email");
  }

  async function forgot(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    setSentMessage(`If ${email.trim()} has an Auto Phoenix account, a password reset link is on its way.`);
    setMode("check-email");
  }

  async function google(): Promise<void> {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      setBusy(false);
      return void toast.error(friendlyError(result.error));
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-night p-12 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-phoenix opacity-20 blur-3xl" />
        <Link to="/">
          <Wordmark tone="light" />
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Rise to every job, <span className="text-phoenix">at every branch.</span>
          </h2>
          <p className="mt-4 text-sidebar-muted">
            Access is granted by your administrator. You'll only see the branches and records assigned to you.
          </p>
        </div>
      </aside>

      <section className="flex flex-col px-6 py-8 safe-top">
        <div className="lg:hidden">
          <Link to="/">
            <Wordmark />
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {init.isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mode === "check-email" ? (
            <div className="animate-rise text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <MailCheck className="h-7 w-7" />
              </div>
              <h1 className="font-display text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">{sentMessage}</p>
              <Button variant="outline" className="mt-6 w-full" onClick={() => setMode(init.data ? "signin" : "setup")}>
                Back
              </Button>
            </div>
          ) : mode === "setup" ? (
            <div className="animate-rise">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">First-time setup</div>
              <h1 className="font-display text-2xl font-bold">Create the Admin account</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This first account gets full Admin access. After this, only the Admin can add staff.
              </p>
              <form onSubmit={setupAdmin} className="mt-7 space-y-4">
                <Field label="Full name" htmlFor="name" required>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
                </Field>
                <Field label="Email" htmlFor="email" required>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </Field>
                <Field label="Password" htmlFor="password" hint="At least 8 characters." required>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </Field>
                <Button type="submit" variant="phoenix" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} Create Admin account
                </Button>
              </form>
              <Divider />
              <GoogleButton onClick={google} disabled={busy} />
            </div>
          ) : mode === "forgot" ? (
            <div className="animate-rise">
              <button onClick={() => setMode("signin")} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
              <h1 className="font-display text-2xl font-bold">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">We'll email you a link to choose a new password.</p>
              <form onSubmit={forgot} className="mt-7 space-y-4">
                <Field label="Email" htmlFor="email" required>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </Field>
                <Button type="submit" variant="phoenix" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} Send reset link
                </Button>
              </form>
            </div>
          ) : (
            <div className="animate-rise">
              <h1 className="font-display text-2xl font-bold">Staff sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">Use the account your Auto Phoenix admin created for you.</p>
              <form onSubmit={signIn} className="mt-7 space-y-4">
                <Field label="Email" htmlFor="email" required>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </Field>
                <Field label="Password" htmlFor="password" required>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </Field>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm font-semibold text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" variant="phoenix" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} Sign in
                </Button>
              </form>
              <Divider />
              <GoogleButton onClick={google} disabled={busy} label="Sign in with Google" />
              <p className="mt-6 text-center text-xs text-muted-foreground">
                No account? Ask your Auto Phoenix admin to add you.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
    </div>
  );
}
