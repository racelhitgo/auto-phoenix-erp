import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Car, ChevronRight, Mail, Pencil, Phone, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailRow, EmptyState, InlineLoader } from "@/components/app/common";
import { CustomerFormDialog } from "@/components/app/CustomerFormDialog";
import { VehicleFormDialog } from "@/components/app/VehicleFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";
import { can } from "@/lib/access";
import { emirateLabel, formatPlate } from "@/lib/uae";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer — Auto Phoenix" },
      { name: "description", content: "Customer details and registered vehicles." },
      { property: "og:title", content: "Customer — Auto Phoenix" },
      { property: "og:description", content: "Customer details and registered vehicles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const access = useAccess();
  const [editOpen, setEditOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const [c, v] = await Promise.all([
        supabase.from("customers").select("*, branches(code, name)").eq("id", id).maybeSingle(),
        supabase.from("vehicles").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (v.error) throw v.error;
      return { customer: c.data, vehicles: v.data };
    },
  });

  if (isLoading) return <InlineLoader />;
  const customer = data?.customer;
  if (!customer)
    return (
      <EmptyState
        icon={Car}
        title="Customer not found"
        description="It may belong to a branch you don't have access to."
        action={
          <Button asChild variant="outline">
            <Link to="/customers">Back to customers</Link>
          </Button>
        }
      />
    );

  const canEdit = can.editCustomers(access.role);
  const canAddVehicle = can.editVehicles(access.role) && customer.is_active;
  const vehicles = data?.vehicles ?? [];

  return (
    <>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="mb-6 overflow-hidden rounded-3xl bg-night p-5 text-sidebar-foreground md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="plate rounded-md bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-muted">{customer.branches?.code}</span>
              <Badge variant={customer.customer_type === "company" ? "soft" : "muted"}>
                {customer.customer_type === "company" ? "Company" : "Individual"}
              </Badge>
              {!customer.is_active && <Badge variant="warning">Inactive</Badge>}
            </div>
            <h1 className="font-display text-2xl font-bold md:text-4xl">{customer.name}</h1>
            {customer.contact_person && <p className="mt-1 text-sidebar-muted">Contact: {customer.contact_person}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="phoenix">
              <a href={`tel:${customer.phone}`}>
                <Phone /> Call
              </a>
            </Button>
            {customer.email && (
              <Button asChild variant="dark" className="bg-sidebar-accent">
                <a href={`mailto:${customer.email}`}>
                  <Mail /> Email
                </a>
              </Button>
            )}
            {canEdit && (
              <Button variant="dark" className="bg-sidebar-accent" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-card md:p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Details</h2>
          <dl className="divide-y">
            <DetailRow label="Mobile" value={customer.phone} />
            <DetailRow label="Alternate" value={customer.alt_phone} />
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Emirate" value={emirateLabel(customer.emirate)} />
            <DetailRow label="Address" value={customer.address} />
            {customer.customer_type === "company" && <DetailRow label="VAT TRN" value={customer.trn && <span className="plate">{customer.trn}</span>} />}
            <DetailRow label="Branch" value={customer.branches?.name} />
            <DetailRow label="Registered" value={format(new Date(customer.created_at), "d MMM yyyy")} />
          </dl>
          {customer.notes && (
            <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notes</div>
              <p className="whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Vehicles ({vehicles.length})</h2>
            {canAddVehicle && (
              <Button variant="soft" size="sm" onClick={() => setVehicleOpen(true)}>
                <Plus /> Add vehicle
              </Button>
            )}
          </div>
          {vehicles.length === 0 ? (
            <EmptyState icon={Car} title="No vehicles yet" description="Add this customer's vehicle to start its service history." />
          ) : (
            <div className="grid gap-2.5">
              {vehicles.map((v) => (
                <Link
                  key={v.id}
                  to="/vehicles/$id"
                  params={{ id: v.id }}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:bg-accent/60"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {v.year ? `${v.year} ` : ""}
                      {v.make} {v.model}
                    </div>
                    <div className="plate mt-0.5 text-sm text-muted-foreground">{formatPlate(v)}</div>
                  </div>
                  {!v.is_active && <Badge variant="muted">Inactive</Badge>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <VehicleFormDialog open={vehicleOpen} onOpenChange={setVehicleOpen} customerId={customer.id} customerName={customer.name} />
    </>
  );
}
