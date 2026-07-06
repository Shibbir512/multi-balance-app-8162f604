import { useQuery } from "@tanstack/react-query";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { GroceryMasterItem } from "@/integrations/firebase/types";

export interface GroceryReminder {
  itemId: string;
  name: string;
  unit: string;
  daysSincePurchase: number;
  averageInterval: number;
  urgency: "due" | "soon" | "upcoming";
  message: string;
}

const MESSAGES_DUE = [
  (name: string) => `${name} কেনার সময় হয়েছে`,
  (name: string) => `${name} শেষ হয়ে যেতে পারে`,
];

const MESSAGES_SOON = [
  (name: string) => `${name} লাগতে পারে`,
  (name: string) => `${name} কেনার সময় আসছে`,
];

function pickMessage(name: string, urgency: "due" | "soon" | "upcoming"): string {
  if (urgency === "due") {
    return MESSAGES_DUE[Math.floor(Math.random() * MESSAGES_DUE.length)](name);
  }
  if (urgency === "soon") {
    return MESSAGES_SOON[Math.floor(Math.random() * MESSAGES_SOON.length)](name);
  }
  return `${name} শীঘ্রই লাগতে পারে`;
}

export function useGroceryReminders(ledgerId: string | undefined) {
  return useQuery({
    queryKey: ["grocery-reminders", ledgerId],
    enabled: !!ledgerId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async (): Promise<GroceryReminder[]> => {
      if (!ledgerId) return [];

      const { data: items, error } = await supabase
        .from("grocery_master_items")
        .select("id, name, unit, last_purchase_date, average_interval")
        .eq("ledger_id", ledgerId)
        .not("last_purchase_date", "is", null)
        .not("average_interval", "is", null);

      if (error) throw error;
      if (!items?.length) return [];

      const today = new Date();
      const reminders: GroceryReminder[] = [];

      for (const item of items) {
        if (!item.last_purchase_date || !item.average_interval || item.average_interval <= 0) continue;

        const lastPurchase = new Date(item.last_purchase_date);
        const daysSince = Math.floor((today.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        const interval = item.average_interval;

        // Due: past or at the interval
        // Soon: within 80% of interval
        // Upcoming: within 60% of interval
        let urgency: "due" | "soon" | "upcoming" | null = null;

        if (daysSince >= interval) {
          urgency = "due";
        } else if (daysSince >= interval * 0.8) {
          urgency = "soon";
        } else if (daysSince >= interval * 0.6) {
          urgency = "upcoming";
        }

        if (urgency) {
          reminders.push({
            itemId: item.id,
            name: item.name,
            unit: item.unit,
            daysSincePurchase: daysSince,
            averageInterval: interval,
            urgency,
            message: pickMessage(item.name, urgency),
          });
        }
      }

      // Sort: due first, then soon, then upcoming
      const order = { due: 0, soon: 1, upcoming: 2 };
      reminders.sort((a, b) => order[a.urgency] - order[b.urgency]);

      return reminders;
    },
  });
}
