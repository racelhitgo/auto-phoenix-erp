import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building, ChevronRight, Plus, Search, User, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState, InlineLoader, PageHeader } from "@/components/app/common";
import { CustomerFormDialog } from "@/components/app/CustomerFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";
import { useBranchScope } from "@/lib/branch-scope";
import { can } from "@/lib/access";
import { emirateLabel, searchTerm } from "@/lib/uae";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Auto Phoenix" },
      { name: "description", content: "Search and manage Auto Phoenix customers by branch." },
      { property: "og:title", content: "Customers — Auto Phoenix" },
      { property: "og:description", content: "Search and manage Auto Phoenix customers by branch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

const LIMIT = 100;

function CustomersPage() {
  const access = useAccess();
  const navigate = useNavigate();
  const { scope, label, activeBranches } = useBranchScope();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const term = searchTerm(q);
  const canEdit = can.editCustomers(access.role);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", "list", scope, term, showInactive],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, customer_type, phone, email, emirate, is_active, created_at, branches(code, name), vehicles(count)", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (scope !== "all") query = query.eq("branch_id", scope);
      if (!showInactive) query = query.eq("is_active", true);
      if (term) {
        const digits = term.replace(/\D/g, "");
        const parts = [`name.ilike.%${term}%`, `email.ilike.%${term}%`, `contact_person.ilike.%${term}%`];
        if (digits.length >= 3) parts.push(`phone.ilike.%${digits.replace(/^0/, "")}%`);
        query = query.or(parts.join(","));
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];

  return (
    <>
      <PageHeader
        eyebrow={label}
        title="Customers"
        subtitle={data ? `${data.count} customer${data.count === 1 ? "" : "s"}` : " "}
        actions={
          canEdit && (
            <Button variant="phoenix" onClick={() => setOpen(true)} disabled={activeBranches.length === 0}>
              <Plus /> New customer
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search name, phone or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive
        </label>
      </div>

      {isLoading ? (
        <InlineLoader />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={term ? "No customers match your search" : "No customers yet"}
          description={
            activeBranches.length === 0
              ? "An admin needs to add a branch before customers can be registered."
              : term
                ? "Try a different name or phone number."
                : canEdit
                  ? "Register your first customer to start building vehicle history."
                  : "Customers registered at your branches will appear here."
          }
          action={
            canEdit && !term && activeBranches.length > 0 ? (
              <Button variant="phoenix" onClick={() => setOpen(true)}>
                <Plus /> New customer
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-2.5 md:hidden">
            {rows.map((c) => (
              <Link
                key={c.id}
                to="/customers/$id"
                params={{ id: c.id }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card active:bg-accent"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  {c.customer_type === "company" ? <Building className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {!c.is_active && <Badge variant="muted">Inactive</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{c.phone}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.branches?.code} · {(c.vehicles as unknown as { count: number }[])[0]?.count ?? 0} vehicle(s)
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Emirate</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 text-right font-semibold">Vehicles</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate({ to: "/customers/$id", params: { id: c.id } })}
                    className="cursor-pointer border-t transition-colors hover:bg-accent/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 font-semibold">
                        {c.name}
                        {c.customer_type === "company" && <Badge variant="soft">Company</Badge>}
                        {!c.is_active && <Badge variant="muted">Inactive</Badge>}
                      </div>
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums">{c.phone}</td>
                    <td className="px-5 py-3.5">{emirateLabel(c.emirate)}</td>
                    <td className="px-5 py-3.5">
                      <span className="plate text-xs">{c.branches?.code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {(c.vehicles as unknown as { count: number }[])[0]?.count ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.count > rows.length && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing the latest {rows.length} of {data.count}. Use search to find others.
            </p>
          )}
        </>
      )}

      <CustomerFormDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={(id) => navigate({ to: "/customers/$id", params: { id } })}
      />
    </>
  );
}
