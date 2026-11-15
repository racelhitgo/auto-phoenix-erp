import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/app/Logo";
import { useSignOut } from "@/hooks/use-sign-out";

const COPY = {
  inactive: {
    title: "Your account is not active",
    body: "Your Auto Phoenix account is waiting for activation or has been deactivated. Please contact your administrator.",
  },
  "no-role": {
    title: "Access pending",
    body: "Your account doesn't have a role yet. Ask your Auto Phoenix admin to assign your role and branches.",
  },
  error: {
    title: "We couldn't load your access",
    body: "Please check your connection and try again. If this continues, contact your administrator.",
  },
} as const;

export function AccessPending({ reason }: { reason: keyof typeof COPY }) {
  const signOut = useSignOut();
  const c = COPY[reason];
  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <Wordmark />
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
        <div className="mt-6 flex gap-2">
          {reason === "error" && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          )}
          <Button variant="dark" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
