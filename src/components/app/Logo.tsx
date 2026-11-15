import mark from "@/assets/phoenix-mark.png";
import { cn } from "@/lib/utils";

export function PhoenixMark({ className }: { className?: string }) {
  return (
    <img
      src={mark}
      alt=""
      width={256}
      height={256}
      className={cn("h-10 w-10 rounded-xl bg-sidebar object-cover", className)}
    />
  );
}

export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <PhoenixMark />
      <div className="leading-none">
        <div
          className={cn(
            "font-display text-[17px] font-extrabold tracking-[0.08em]",
            tone === "light" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          AUTO <span className="text-phoenix">PHOENIX</span>
        </div>
        <div
          className={cn(
            "mt-1 text-[10px] font-semibold uppercase tracking-[0.28em]",
            tone === "light" ? "text-sidebar-muted" : "text-muted-foreground",
          )}
        >
          Garage Management
        </div>
      </div>
    </div>
  );
}
