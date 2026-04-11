import { Bell, AlertTriangle, Clock } from "lucide-react";
import type { GroceryReminder } from "@/hooks/useGroceryReminders";

interface GroceryRemindersProps {
  reminders: GroceryReminder[];
  compact?: boolean;
}

const urgencyConfig = {
  due: {
    icon: AlertTriangle,
    bgClass: "bg-red-500/10 border-red-500/20",
    iconClass: "text-red-400",
    textClass: "text-red-400",
    pillClass: "bg-red-500/20 text-red-400",
    label: "এখনই কিনুন",
  },
  soon: {
    icon: Bell,
    bgClass: "bg-amber-500/10 border-amber-500/20",
    iconClass: "text-amber-400",
    textClass: "text-amber-400",
    pillClass: "bg-amber-500/20 text-amber-400",
    label: "শীঘ্রই লাগবে",
  },
  upcoming: {
    icon: Clock,
    bgClass: "bg-blue-500/10 border-blue-500/20",
    iconClass: "text-blue-400",
    textClass: "text-muted-foreground",
    pillClass: "bg-blue-500/20 text-blue-400",
    label: "আসছে",
  },
};

const GroceryReminders = ({ reminders, compact = false }: GroceryRemindersProps) => {
  if (!reminders.length) return null;

  if (compact) {
    const urgent = reminders.filter((r) => r.urgency !== "upcoming").slice(0, 3);
    if (!urgent.length) return null;

    return (
      <div className="space-y-1.5">
        {urgent.map((r) => {
          const config = urgencyConfig[r.urgency];
          const Icon = config.icon;
          return (
            <div
              key={r.itemId}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${config.bgClass} animate-fade-in`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconClass}`} />
              <p className={`text-xs font-semibold ${config.textClass}`}>{r.message}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-muted-foreground" /> রিমাইন্ডার
      </h3>
      <div className="space-y-1.5">
        {reminders.map((r) => {
          const config = urgencyConfig[r.urgency];
          const Icon = config.icon;
          return (
            <div key={r.itemId} className={`premium-card border ${config.bgClass} p-3`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${config.textClass}`}>{r.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.daysSincePurchase} দিন আগে কেনা • গড় {r.averageInterval} দিন
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${config.pillClass}`}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroceryReminders;
