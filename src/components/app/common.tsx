import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  tone?: "default" | "dark";
}) {
  return (
    <div
      className={cn(
        "animate-rise relative overflow-hidden rounded-2xl border p-4 shadow-card md:p-5",
        tone === "dark" ? "border-transparent bg-night text-sidebar-foreground" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            tone === "dark" ? "text-sidebar-muted" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            tone === "dark" ? "bg-phoenix text-primary-foreground" : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums md:text-4xl">{value}</div>
      {hint && (
        <div className={cn("mt-1 text-xs", tone === "dark" ? "text-sidebar-muted" : "text-muted-foreground")}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function FullScreenLoader({ label = "Loading Auto Phoenix…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
