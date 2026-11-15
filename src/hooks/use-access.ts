import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { primaryRole, type Access, type AppRole } from "@/lib/access";

export const accessQueryKey = ["access"] as const;

async function fetchAccess(): Promise<Access | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [profileRes, rolesRes, branchesRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, is_active").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("user_branches").select("branch_id").eq("user_id", user.id),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (branchesRes.error) throw branchesRes.error;
  return {
    userId: user.id,
    email: profileRes.data?.email ?? user.email ?? null,
    fullName: profileRes.data?.full_name || user.email || "Staff member",
    phone: profileRes.data?.phone ?? null,
    isActive: profileRes.data?.is_active ?? false,
    role: primaryRole((rolesRes.data ?? []).map((r) => r.role as AppRole)),
    branchIds: (branchesRes.data ?? []).map((b) => b.branch_id),
  };
}

export function useAccessQuery() {
  return useQuery({ queryKey: accessQueryKey, queryFn: fetchAccess, staleTime: 60_000 });
}

/** Use inside the signed-in area, where access is guaranteed to be loaded. */
export function useAccess(): Access {
  const qc = useQueryClient();
  const data = qc.getQueryData<Access | null>(accessQueryKey);
  const q = useAccessQuery();
  const access = q.data ?? data;
  if (!access) throw new Error("useAccess used outside the signed-in area");
  return access;
}
