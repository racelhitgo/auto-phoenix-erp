import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark, PhoenixMark } from "@/components/app/Logo";
import { BranchSwitcher } from "@/components/app/BranchSwitcher";
import { navFor, type NavItem } from "@/components/app/nav";
import { useAccess } from "@/hooks/use-access";
import { useSignOut } from "@/hooks/use-sign-out";
import { ROLE_LABELS } from "@/lib/access";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(to + "/");
}

const GROUP_LABELS: Record<NavItem["group"], string> = {
  operations: "Operations",
  admin: "Administration",
  account: "Account",
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const access = useAccess();
  const { pathname } = useLocation();
  const items = navFor(access.role);
  const groups = (["operations", "admin", "account"] as const).map((g) => ({
    g,
    items: items.filter((i) => i.group === g),
  }));

  return (
    <nav className="flex flex-col gap-6">
      {groups
        .filter((x) => x.items.length > 0)
        .map(({ g, items }) => (
          <div key={g}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-sidebar-muted">
              {GROUP_LABELS[g]}
            </div>
            <div className="flex flex-col gap-1">
              {items.map((item) => {
                const active = isActivePath(pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        active ? "bg-phoenix text-primary-foreground" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </nav>
  );
}

function UserCard() {
  const access = useAccess();
  const signOut = useSignOut();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-phoenix font-display text-sm font-bold text-primary-foreground">
        {initials(access.fullName) || "AP"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-sidebar-foreground">{access.fullName}</div>
        <div className="truncate text-xs text-sidebar-muted">{access.role ? ROLE_LABELS[access.role] : ""}</div>
      </div>
      <button
        onClick={signOut}
        aria-label="Sign out"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function MobileTabBar() {
  const access = useAccess();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const tabs = navFor(access.role).filter((i) => i.group === "operations");
  const moreActive = !tabs.some((t) => isActivePath(pathname, t.to));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar safe-bottom lg:hidden">
      <div className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = isActivePath(pathname, t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                active ? "text-sidebar-primary" : "text-sidebar-muted",
              )}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(
              "flex h-16 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-semibold",
              moreActive ? "text-sidebar-primary" : "text-sidebar-muted",
            )}
          >
            <Menu className="h-5 w-5" />
            More
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl border-sidebar-border bg-sidebar p-5 text-sidebar-foreground safe-bottom">
            <SheetHeader className="mb-4 p-0 text-left">
              <SheetTitle className="text-sidebar-foreground">Menu</SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <div className="mt-6">
              <UserCard />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-sidebar p-5 lg:flex">
        <Link to="/dashboard" className="mb-8 px-1">
          <Wordmark tone="light" />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <UserCard />
      </aside>

      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md safe-top">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
            <Link to="/dashboard" className="lg:hidden" aria-label="Dashboard">
              <PhoenixMark className="h-9 w-9" />
            </Link>
            <BranchSwitcher className="max-w-[70vw] md:max-w-xs" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-12">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
