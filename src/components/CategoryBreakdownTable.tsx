import { useState, useMemo } from "react";
import { TableProperties, TrendingDown, TrendingUp, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { getCategoryConfig } from "@/lib/categoryColors";

interface Transaction {
  type: string;
  amount: number;
  categories?: { name: string } | null;
}

interface Props {
  transactions: Transaction[];
}

const CategoryBreakdownTable = ({ transactions }: Props) => {
  const [activeType, setActiveType] = useState<"expense" | "income">("expense");
  const [showAll, setShowAll] = useState(false);

  // Group by category for selected type
  const data = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    transactions
      .filter((t) => t.type === activeType)
      .forEach((t) => {
        const cat = (t.categories as { name?: string })?.name || "অন্যান্য";
        const cur = map.get(cat) || { amount: 0, count: 0 };
        cur.amount += t.amount;
        cur.count += 1;
        map.set(cat, cur);
      });

    return Array.from(map.entries())
      .map(([name, val]) => ({ name, amount: val.amount, count: val.count }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, activeType]);

  const total = useMemo(() => data.reduce((s, d) => s + d.amount, 0), [data]);

  // Counts for tabs
  const expenseCount = useMemo(
    () => transactions.filter((t) => t.type === "expense").length,
    [transactions]
  );
  const incomeCount = useMemo(
    () => transactions.filter((t) => t.type === "income").length,
    [transactions]
  );

  const displayedData = showAll ? data : data.slice(0, 6);

  if (transactions.length === 0) {
    return (
      <div className="premium-card p-6 text-center text-muted-foreground">
        <p className="text-sm font-medium">কোনো ক্যাটাগরি তথ্য পাওয়া যায়নি</p>
      </div>
    );
  }

  return (
    <div className="premium-card p-0 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
      {/* Decorative gradient halo */}
      <div
        className="absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
      />

      {/* Header Band */}
      <div
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/60"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 4px 12px -2px hsl(var(--primary) / 0.35)",
            }}
          >
            <TableProperties className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
              ক্যাটাগরি ভিত্তিক বিশ্লেষণ
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {data.length}টি খাতে মোট ৳{total.toLocaleString("bn-BD")}
            </p>
          </div>
        </div>

        {/* Type Switcher Pills */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveType("expense");
              setShowAll(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeType === "expense"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            খরচ ({expenseCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveType("income");
              setShowAll(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeType === "income"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            জমা ({incomeCount})
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="p-5">
        {data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">এই ক্যাটাগরিতে কোনো তথ্য নেই</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedData.map((d, index) => {
              const percentage = total > 0 ? Math.round((d.amount / total) * 100) : 0;
              const config = getCategoryConfig(d.name, activeType);
              const Icon = config.icon;

              return (
                <div
                  key={d.name}
                  className="p-3.5 rounded-xl border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    {/* Left: Rank + Icon + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-muted/80 text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: config.bg, color: config.text }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-foreground truncate">
                          {d.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {d.count}টি লেনদেন
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount & % Badge */}
                    <div className="text-right shrink-0 flex items-center gap-2.5">
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-extrabold text-foreground">
                          ৳{d.amount.toLocaleString("bn-BD")}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          activeType === "income"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-muted/70 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeType === "income"
                          ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                          : "bg-gradient-to-r from-rose-400 to-red-500"
                      }`}
                      style={{ width: `${Math.max(percentage, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Show All / Show Less Button */}
            {data.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs sm:text-sm font-bold text-primary flex items-center justify-center gap-1.5 transition-colors bg-primary/5 hover:bg-primary/10"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" /> কম দেখুন
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" /> বাকি {data.length - 6}টি ক্যাটাগরি দেখুন
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBreakdownTable;
