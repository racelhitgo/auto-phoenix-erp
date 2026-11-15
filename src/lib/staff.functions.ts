import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "accountant", "sales_agent", "supervisor"]);

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  password: z.string().min(8).max(72),
  role: roleEnum,
  branchIds: z.array(z.string().uuid()).max(50),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error || data !== true) throw new Error("Only an admin can manage staff accounts.");
}

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createStaffSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.role !== "admin" && data.branchIds.length === 0) {
      throw new Error("Assign at least one branch.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      app_metadata: { created_by_admin: true },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "Could not create the account.";
      throw new Error(/already/i.test(msg) ? "An account with this email already exists." : msg);
    }

    const { error: accessError } = await context.supabase.rpc("admin_set_user_access", {
      _user_id: created.user.id,
      _role: data.role,
      _branch_ids: data.branchIds,
      _is_active: true,
      _full_name: data.fullName,
      _phone: data.phone || undefined,
    });
    if (accessError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(accessError.message);
    }
    return { userId: created.user.id };
  });

const resetSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const adminSetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
