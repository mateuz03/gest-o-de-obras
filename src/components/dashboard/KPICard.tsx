import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  hint?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-700",
  valueColor = "text-slate-900",
  hint,
}: KPICardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={cn("mt-2 text-2xl font-bold leading-tight truncate", valueColor)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5 shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
