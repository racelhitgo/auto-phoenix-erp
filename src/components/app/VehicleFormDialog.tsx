import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/app/common";
import { FormDialog } from "@/components/app/FormDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CAR_MAKES, EMIRATES, searchTerm, type Emirate } from "@/lib/uae";
import { friendlyError } from "@/lib/errors";
import { useBranchScope } from "@/lib/branch-scope";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
const NONE = "__none";

function CustomerPicker({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) {
  const [q, setQ] = useState("");
  const { scope } = useBranchScope();
  const term = searchTerm(q);
  const results = useQuery({
    queryKey: ["customers", "picker", scope, term],
    enabled: term.length >= 2,
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, phone")
        .eq("is_active", true)
        .or(`name.ilike.%${term}%,phone.ilike.%${term.replace(/\s/g, "")}%`)
        .order("name")
        .limit(8);
      if (scope !== "all") query = query.eq("branch_id", scope);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {term.length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border">
          {results.data?.length === 0 && <div className="p-3 text-sm text-muted-foreground">No matching customers.</div>}
          {results.data?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id, c.name);
                setQ("");
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 border-b px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent ${
                value === c.id ? "bg-primary-soft" : ""
              }`}
            >
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  customerId,
  customerName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicle?: Vehicle | null;
  customerId?: string;
  customerName?: string;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [owner, setOwner] = useState<{ id: string; name: string }>({ id: "", name: "" });
  const [f, setF] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plate_emirate: "dubai" as Emirate | typeof NONE,
    plate_code: "",
    plate_number: "",
    vin: "",
    odometer_km: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setOwner({ id: vehicle?.customer_id ?? customerId ?? "", name: customerName ?? "" });
    setF(
      vehicle
        ? {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year?.toString() ?? "",
            color: vehicle.color ?? "",
            plate_emirate: vehicle.plate_emirate ?? NONE,
            plate_code: vehicle.plate_code ?? "",
            plate_number: vehicle.plate_number ?? "",
            vin: vehicle.vin ?? "",
            odometer_km: vehicle.odometer_km?.toString() ?? "",
            notes: vehicle.notes ?? "",
            is_active: vehicle.is_active,
          }
        : {
            make: "",
            model: "",
            year: "",
            color: "",
            plate_emirate: "dubai",
            plate_code: "",
            plate_number: "",
            vin: "",
            odometer_km: "",
            notes: "",
            is_active: true,
          },
    );
  }, [open, vehicle, customerId, customerName]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!owner.id) return toast.error("Choose the vehicle owner.");
    if (!f.make.trim() || !f.model.trim()) return toast.error("Enter the make and model.");
    const year = f.year ? Number(f.year) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1))
      return toast.error("Enter a valid model year.");
    const odo = f.odometer_km ? Number(f.odometer_km.replace(/[^\d]/g, "")) : null;
    const vin = f.vin.replace(/\s/g, "").toUpperCase();
    if (vin && vin.length !== 17) return toast.error("VIN must be 17 characters.");

    const payload = {
      customer_id: owner.id,
      make: f.make.trim(),
      model: f.model.trim(),
      year,
      color: f.color.trim() || null,
      plate_emirate: f.plate_emirate === NONE ? null : f.plate_emirate,
      plate_code: f.plate_code.trim() || null,
      plate_number: f.plate_number.trim() || null,
      vin: vin || null,
      odometer_km: odo,
      notes: f.notes.trim() || null,
      is_active: f.is_active,
    };
    setBusy(true);
    // branch_id is set by the database from the owner's branch
    const res = vehicle
      ? await supabase.from("vehicles").update(payload).eq("id", vehicle.id).select("id").single()
      : await supabase
          .from("vehicles")
          .insert({ ...payload, branch_id: "00000000-0000-0000-0000-000000000000" })
          .select("id")
          .single();
    setBusy(false);
    if (res.error) return toast.error(friendlyError(res.error));
    toast.success(vehicle ? "Vehicle updated." : "Vehicle added.");
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["vehicle", res.data.id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onOpenChange(false);
    onSaved?.(res.data.id);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={vehicle ? "Edit vehicle" : "New vehicle"}
      onSubmit={submit}
      busy={busy}
      submitLabel={vehicle ? "Save changes" : "Add vehicle"}
      wide
    >
      <Field label="Owner" required>
        {customerId || vehicle ? (
          <div className="flex h-11 items-center rounded-xl border bg-muted px-3.5 text-sm font-semibold">
            {owner.name || "Selected customer"}
          </div>
        ) : (
          <>
            {owner.id && (
              <div className="mb-2 flex h-11 items-center justify-between rounded-xl border border-primary/40 bg-primary-soft px-3.5 text-sm font-semibold">
                {owner.name}
                <button type="button" className="text-xs text-primary" onClick={() => setOwner({ id: "", name: "" })}>
                  Change
                </button>
              </div>
            )}
            {!owner.id && <CustomerPicker value={owner.id} onChange={(id, name) => setOwner({ id, name })} />}
          </>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Make" htmlFor="v-make" required>
          <Input id="v-make" list="ap-car-makes" value={f.make} onChange={(e) => set("make", e.target.value)} />
          <datalist id="ap-car-makes">
            {CAR_MAKES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field label="Model" htmlFor="v-model" required>
          <Input id="v-model" value={f.model} onChange={(e) => set("model", e.target.value)} />
        </Field>
        <Field label="Year" htmlFor="v-year">
          <Input id="v-year" inputMode="numeric" value={f.year} onChange={(e) => set("year", e.target.value)} />
        </Field>
        <Field label="Colour" htmlFor="v-color">
          <Input id="v-color" value={f.color} onChange={(e) => set("color", e.target.value)} />
        </Field>
      </div>

      <div className="rounded-2xl border bg-muted/50 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Number plate</div>
        <div className="grid grid-cols-[1.3fr_0.7fr_1fr] gap-2">
          <Select value={f.plate_emirate} onValueChange={(v) => set("plate_emirate", v as Emirate)}>
            <SelectTrigger aria-label="Plate emirate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Other</SelectItem>
              {EMIRATES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input aria-label="Plate code" placeholder="Code" className="plate" value={f.plate_code} onChange={(e) => set("plate_code", e.target.value)} />
          <Input aria-label="Plate number" placeholder="Number" inputMode="numeric" className="plate" value={f.plate_number} onChange={(e) => set("plate_number", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="VIN / chassis no." htmlFor="v-vin" hint="17 characters">
          <Input id="v-vin" className="plate" value={f.vin} onChange={(e) => set("vin", e.target.value)} />
        </Field>
        <Field label="Odometer (km)" htmlFor="v-odo">
          <Input id="v-odo" inputMode="numeric" value={f.odometer_km} onChange={(e) => set("odometer_km", e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="v-notes" className="sm:col-span-2">
          <Textarea id="v-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      {vehicle && (
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-semibold">Active vehicle</div>
            <div className="text-xs text-muted-foreground">Mark inactive if sold or no longer serviced. Records are kept.</div>
          </div>
          <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </label>
      )}
    </FormDialog>
  );
}
