import { Building2, Car, LayoutDashboard, ScrollText, Settings, UserCog, Users, type LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/access";

export interface NavItem {
  to: "/dashboard" | "/customers" | "/vehicles" | "/branches" | "/staff" | "/audit-log" | "/settings";
  label: string;
  icon: LucideIcon;
  roles?: AppRole[]; // undefined = everyone
  group: "operations" | "admin" | "account";
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "operations" },
  { to: "/customers", label: "Customers", icon: Users, group: "operations" },
  { to: "/vehicles", label: "Vehicles", icon: Car, group: "operations" },
  { to: "/branches", label: "Branches", icon: Building2, group: "admin" },
  { to: "/staff", label: "Staff", icon: UserCog, roles: ["admin"], group: "admin" },
  { to: "/audit-log", label: "Audit log", icon: ScrollText, roles: ["admin"], group: "admin" },
  { to: "/settings", label: "Settings", icon: Settings, group: "account" },
];

export function navFor(role: AppRole | null) {
  return NAV_ITEMS.filter((i) => !i.roles || (role !== null && i.roles.includes(role)));
}
