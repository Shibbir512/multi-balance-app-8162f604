import { Bell, AlertTriangle, Clock } from "lucide-react";
import type { GroceryReminder } from "@/hooks/useGroceryReminders";

interface GroceryRemindersProps {
  reminders: GroceryReminder[];
  compact?: boolean;
}

const urgencyConfig = {
  due: {
    icon: AlertTriangle,
    bgClass: "bg-red-50 border-red-200",
    iconClass: "text-red-500",
    textClass: "text-red-600",
    pillClass: "bg-red-100 text-red-600",
    label: "এখনই কিনুন",
  },
  soon: {
    icon: Bell,
    bgClass: "bg-amber-50 border-amber-200",
    iconClass: "text-amber-500",
    textClass: "text-amber-700",
    pillClass: "bg-amber-100 text-amber-600",
    label: "শীঘ্রই লাগবে",
  },
  upcoming: {
    icon: Clock,
    bgClass: "bg-blue-50 border-blue-200",
    iconClass: "text-blue-500",
    textClass: "text-muted-foreground",
    pillClass: "bg-blue-100 text-blue-600",
    label: "আসছে",
  },
};

const GroceryReminders = ({ reminders, compact = false }: GroceryRemindersProps) => {
  if (!reminders.length) return null;

  if (compact) {
    const urgent = reminders.filter((r) => r.urgency !== "upcoming").slice(0, 3);
    if (!urgent.length) return null;

    return (
      <div className="space-y-2">
        {urgent.map((r) => {
          const config = urgencyConfig[r.urgency];
          const Icon = config.icon;
          return (
            <div
              key={r.itemId}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border ${config.bgClass} animate-fade-in`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${config.iconClass}`} />
              <p className={`text-xs font-semibold ${config.textClass}`}>{r.message}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-bold flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-muted-foreground" /> রিমাইন্ডার
      </h3>
      <div className="space-y-2">
        {reminders.map((r) => {
          const config = urgencyConfig[r.urgency];
          const Icon = config.icon;
          return (
            <div key={r.itemId} className={`premium-card border ${config.bgClass} p-3.5`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                  <Icon className={`w-4 h-4 ${config.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${config.textClass}`}>{r.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.daysSincePurchase} দিন আগে কেনা • গড় {r.averageInterval} দিন
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${config.pillClass}`}>
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
