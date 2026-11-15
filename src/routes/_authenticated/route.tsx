import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAccessQuery } from "@/hooks/use-access";
import { hasAppAccess, can } from "@/lib/access";
import { FullScreenLoader } from "@/components/app/common";
import { AccessPending } from "@/components/app/AccessPending";
import { AppShell } from "@/components/app/AppShell";
import { BranchScopeProvider } from "@/lib/branch-scope";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: access, isLoading, error } = useAccessQuery();

  if (isLoading) return <FullScreenLoader />;
  if (error || !access) return <AccessPending reason="error" />;
  if (!hasAppAccess(access)) return <AccessPending reason={access.isActive ? "no-role" : "inactive"} />;

  return (
    <BranchScopeProvider isAdmin={can.viewAllBranches(access.role)}>
      <AppShell>
        <Outlet />
      </AppShell>
    </BranchScopeProvider>
  );
}
