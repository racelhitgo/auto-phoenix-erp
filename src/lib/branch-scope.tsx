import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useBranches, type Branch } from "@/hooks/use-branches";

const STORAGE_KEY = "ap.branchScope";

interface BranchScopeValue {
  /** "all" = every branch the user can access */
  scope: string;
  setScope: (s: string) => void;
  branches: Branch[];
  activeBranches: Branch[];
  current: Branch | null;
  label: string;
}

const Ctx = createContext<BranchScopeValue | null>(null);

export function BranchScopeProvider({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  const { data: branches = [] } = useBranches();
  const [scope, setScopeState] = useState<string>("all");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setScopeState(saved);
  }, []);

  // Fall back to "all" if the saved branch is no longer accessible.
  useEffect(() => {
    if (scope !== "all" && branches.length > 0 && !branches.some((b) => b.id === scope)) {
      setScopeState("all");
    }
  }, [branches, scope]);

  const value = useMemo<BranchScopeValue>(() => {
    const current = scope === "all" ? null : (branches.find((b) => b.id === scope) ?? null);
    return {
      scope,
      setScope: (s) => {
        setScopeState(s);
        window.localStorage.setItem(STORAGE_KEY, s);
      },
      branches,
      activeBranches: branches.filter((b) => b.is_active),
      current,
      label: current ? current.name : isAdmin ? "All branches" : branches.length === 1 ? branches[0].name : "My branches",
    };
  }, [scope, branches, isAdmin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBranchScope() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBranchScope must be used inside BranchScopeProvider");
  return v;
}
