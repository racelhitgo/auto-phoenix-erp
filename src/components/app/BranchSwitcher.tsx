import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBranchScope } from "@/lib/branch-scope";
import { useAccess } from "@/hooks/use-access";
import { can } from "@/lib/access";
import { cn } from "@/lib/utils";

export function BranchSwitcher({ className }: { className?: string }) {
  const { scope, setScope, branches, label } = useBranchScope();
  const access = useAccess();
  const isAdmin = can.viewAllBranches(access.role);
  const showAll = isAdmin || branches.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent",
          className,
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Branch view</DropdownMenuLabel>
        {showAll && (
          <DropdownMenuItem onClick={() => setScope("all")} className="h-10 cursor-pointer">
            {isAdmin ? "All branches (consolidated)" : "All my branches"}
            {scope === "all" && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        )}
        {branches.length > 0 && showAll && <DropdownMenuSeparator />}
        {branches.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground">No branches yet.</div>
        )}
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setScope(b.id)} className="h-10 cursor-pointer">
            <span className="plate mr-1 text-xs text-muted-foreground">{b.code}</span>
            <span className="truncate">{b.name}</span>
            {!b.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}
            {scope === b.id && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
