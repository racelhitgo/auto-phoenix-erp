import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/app/common";
import { FormDialog } from "@/components/app/FormDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useBranchScope } from "@/lib/branch-scope";
import { EMIRATES, type Emirate } from "@/lib/uae";
import { friendlyError } from "@/lib/errors";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerType = Database["public"]["Enums"]["customer_type"];

const NONE = "__none";

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer?: Customer | null;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { activeBranches, current } = useBranchScope();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    branch_id: "",
    customer_type: "individual" as CustomerType,
    name: "",
    contact_person: "",
    phone: "",
    alt_phone: "",
    email: "",
    emirate: "dubai" as Emirate | typeof NONE,
    address: "",
    trn: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setF({
        branch_id: customer.branch_id,
        customer_type: customer.customer_type,
        name: customer.name,
        contact_person: customer.contact_person ?? "",
        phone: customer.phone,
        alt_phone: customer.alt_phone ?? "",
        email: customer.email ?? "",
        emirate: customer.emirate ?? NONE,
        address: customer.address ?? "",
        trn: customer.trn ?? "",
        notes: customer.notes ?? "",
        is_active: customer.is_active,
      });
    } else {
      setF((p) => ({
        ...p,
        branch_id: current?.is_active ? current.id : activeBranches.length === 1 ? activeBranches[0].id : "",
        customer_type: "individual",
        name: "",
        contact_person: "",
        phone: "",
        alt_phone: "",
        email: "",
        emirate: "dubai",
        address: "",
        trn: "",
        notes: "",
        is_active: true,
      }));
    }
  }, [open, customer, current, activeBranches]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const isCompany = f.customer_type === "company";

  async function submit() {
    if (!f.branch_id) return toast.error("Choose a branch.");
    if (!f.name.trim()) return toast.error(isCompany ? "Enter the company name." : "Enter the customer's name.");
    if (!f.phone.trim()) return toast.error("Enter a phone number.");
    const trnDigits = f.trn.replace(/\D/g, "");
    if (trnDigits && trnDigits.length !== 15) return toast.error("TRN must be exactly 15 digits.");

    const payload = {
      branch_id: f.branch_id,
      customer_type: f.customer_type,
      name: f.name.trim(),
      contact_person: isCompany ? f.contact_person.trim() || null : null,
      phone: f.phone.trim(),
      alt_phone: f.alt_phone.trim() || null,
      email: f.email.trim() || null,
      emirate: f.emirate === NONE ? null : f.emirate,
      address: f.address.trim() || null,
      trn: isCompany ? trnDigits || null : null,
      notes: f.notes.trim() || null,
      is_active: f.is_active,
    };

    setBusy(true);
    const res = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id).select("id").single()
      : await supabase.from("customers").insert(payload).select("id").single();
    setBusy(false);
    if (res.error) return toast.error(friendlyError(res.error));
    toast.success(customer ? "Customer updated." : "Customer added.");
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["customer", res.data.id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onOpenChange(false);
    onSaved?.(res.data.id);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? "Edit customer" : "New customer"}
      description={customer ? undefined : "Register a customer at one of your branches."}
      onSubmit={submit}
      busy={busy}
      submitLabel={customer ? "Save changes" : "Add customer"}
      wide
    >
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {(["individual", "company"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set("customer_type", t)}
            className={`h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors ${
              f.customer_type === t ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "individual" ? "Individual" : "Company"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch" required>
          <Select value={f.branch_id} onValueChange={(v) => set("branch_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose branch" />
            </SelectTrigger>
            <SelectContent>
              {activeBranches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={isCompany ? "Company name" : "Full name"} htmlFor="c-name" required>
          <Input id="c-name" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
        </Field>
        {isCompany && (
          <Field label="Contact person" htmlFor="c-contact">
            <Input id="c-contact" value={f.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
          </Field>
        )}
        <Field label="Mobile number" htmlFor="c-phone" hint="e.g. 050 123 4567" required>
          <Input id="c-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Alternate number" htmlFor="c-alt">
          <Input id="c-alt" type="tel" inputMode="tel" value={f.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="c-email">
          <Input id="c-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Emirate">
          <Select value={f.emirate} onValueChange={(v) => set("emirate", v as Emirate)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not specified</SelectItem>
              {EMIRATES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {isCompany && (
          <Field label="VAT TRN" htmlFor="c-trn" hint="15-digit Tax Registration Number">
            <Input id="c-trn" inputMode="numeric" value={f.trn} onChange={(e) => set("trn", e.target.value)} />
          </Field>
        )}
        <Field label="Address" htmlFor="c-address" className="sm:col-span-2">
          <Input id="c-address" value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="c-notes" className="sm:col-span-2">
          <Textarea id="c-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      {customer && (
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-semibold">Active customer</div>
            <div className="text-xs text-muted-foreground">Inactive customers are hidden from dashboards but never deleted.</div>
          </div>
          <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </label>
      )}
    </FormDialog>
  );
}
