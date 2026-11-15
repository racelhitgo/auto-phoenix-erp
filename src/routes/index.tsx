import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Car, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/app/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auto Phoenix — Garage Management" },
      {
        name: "description",
        content: "Auto Phoenix staff portal for branches, customers, vehicles and workshop operations across Dubai.",
      },
      { property: "og:title", content: "Auto Phoenix — Garage Management" },
      {
        property: "og:description",
        content: "Staff portal for Auto Phoenix branches, customers, vehicles and workshop operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Building2, label: "Multi-branch control" },
  { icon: Users, label: "Customer records" },
  { icon: Car, label: "Vehicle history" },
  { icon: ShieldCheck, label: "Role-based security" },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-sidebar-foreground">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-phoenix opacity-20 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 safe-top">
        <header className="flex items-center justify-between">
          <Wordmark tone="light" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="animate-rise max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" /> Dubai · Staff portal
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Every branch.
              <br />
              Every vehicle. <span className="text-phoenix">One system.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-sidebar-muted md:text-lg">
              The operating system for Auto Phoenix workshops — customers, vehicles and branches, secured by role.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {signedIn ? (
                <Button asChild variant="phoenix" size="lg">
                  <Link to="/dashboard">
                    Open dashboard <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="phoenix" size="lg">
                  <Link to="/auth">
                    Staff sign in <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
                <f.icon className="h-5 w-5 text-sidebar-primary" />
                <div className="mt-3 text-sm font-semibold">{f.label}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-xs text-sidebar-muted">© {new Date().getFullYear()} Auto Phoenix · Authorised staff only</footer>
      </div>
    </main>
  );
}
