import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertTriangle, Clock } from "lucide-react";
import type { GroceryReminder } from "@/hooks/useGroceryReminders";

interface GroceryRemindersProps {
  reminders: GroceryReminder[];
  compact?: boolean;
}

const urgencyConfig = {
  due: {
    icon: AlertTriangle,
    bgClass: "bg-destructive/10 border-destructive/20",
    iconClass: "text-destructive",
    textClass: "text-destructive",
    label: "এখনই কিনুন",
  },
  soon: {
    icon: Bell,
    bgClass: "bg-amber-500/10 border-amber-500/20",
    iconClass: "text-amber-500",
    textClass: "text-amber-600",
    label: "শীঘ্রই লাগবে",
  },
  upcoming: {
    icon: Clock,
    bgClass: "bg-primary/5 border-primary/15",
    iconClass: "text-primary",
    textClass: "text-muted-foreground",
    label: "আসছে",
  },
};

const GroceryReminders = ({ reminders, compact = false }: GroceryRemindersProps) => {
  if (!reminders.length) return null;

  if (compact) {
    // Compact view for dashboard — show only due/soon, max 3
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
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${config.bgClass} animate-fade-in`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconClass}`} />
              <p className={`text-xs font-medium ${config.textClass}`}>{r.message}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // Full view for grocery screen
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5" /> রিমাইন্ডার
      </h3>
      <div className="space-y-1.5">
        {reminders.map((r) => {
          const config = urgencyConfig[r.urgency];
          const Icon = config.icon;
          return (
            <Card key={r.itemId} className={`border ${config.bgClass} animate-fade-in`}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgClass}`}>
                  <Icon className={`w-4 h-4 ${config.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${config.textClass}`}>{r.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.daysSincePurchase} দিন আগে কেনা • গড় {r.averageInterval} দিন
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
                  {config.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default GroceryReminders;
