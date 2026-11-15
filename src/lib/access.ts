import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLES: AppRole[] = ["admin", "accountant", "sales_agent", "supervisor"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  accountant: "Accountant",
  sales_agent: "Sales Agent",
  supervisor: "Supervisor",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full access to all branches, staff, settings and reports.",
  accountant: "Finance, purchases, payments, expenses and invoices.",
  sales_agent: "Customers, vehicles, quotations and job cards.",
  supervisor: "Workshop tasks, job progress, materials and quality checks.",
};

export interface Access {
  userId: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  role: AppRole | null;
  branchIds: string[];
}

/**
 * Screen-level permission checks. These mirror the database access rules,
 * which remain the real gate — the screens only hide what the database would refuse.
 */
export const can = {
  manageBranches: (role: AppRole | null) => role === "admin",
  manageStaff: (role: AppRole | null) => role === "admin",
  viewAuditLog: (role: AppRole | null) => role === "admin",
  viewAllBranches: (role: AppRole | null) => role === "admin",
  editCustomers: (role: AppRole | null) => role === "admin" || role === "sales_agent",
  editVehicles: (role: AppRole | null) => role === "admin" || role === "sales_agent",
  uploadVehicleFiles: (role: AppRole | null) =>
    role === "admin" || role === "sales_agent" || role === "supervisor",
};

/** An account may use the app only when active and given a role. */
export function hasAppAccess(access: Pick<Access, "isActive" | "role"> | null | undefined) {
  return !!access && access.isActive && access.role !== null;
}

/** Pick the single role to show; the database allows one role per staff member via the admin tools. */
export function primaryRole(roles: AppRole[]): AppRole | null {
  for (const r of ROLES) if (roles.includes(r)) return r;
  return null;
}
