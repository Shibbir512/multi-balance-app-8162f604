import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface Transaction {
  date: string;
  type: string;
  amount: number;
}

interface MonthlyChartProps {
  transactions: Transaction[];
}

const MONTH_NAMES_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const MonthlyChart = ({ transactions }: MonthlyChartProps) => {
  const chartData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    transactions.forEach((t) => {
      const key = t.date.slice(0, 7); // YYYY-MM
      const entry = map.get(key) || { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => {
        const [, m] = key.split("-");
        const monthIndex = parseInt(m, 10) - 1;
        return {
          key,
          name: MONTH_NAMES_BN[monthIndex] || key,
          income: val.income,
          expense: val.expense,
          net: val.income - val.expense,
        };
      });
  }, [transactions]);

  // Derived metrics
  const stats = useMemo(() => {
    if (!chartData.length) return { avgIncome: 0, avgExpense: 0, maxExpenseMonth: null };
    const totalInc = chartData.reduce((s, c) => s + c.income, 0);
    const totalExp = chartData.reduce((s, c) => s + c.expense, 0);
    const avgIncome = Math.round(totalInc / chartData.length);
    const avgExpense = Math.round(totalExp / chartData.length);

    let maxExp = 0;
    let maxExpenseMonth = chartData[0]?.name || "";
    chartData.forEach((c) => {
      if (c.expense > maxExp) {
        maxExp = c.expense;
        maxExpenseMonth = c.name;
      }
    });

    return { avgIncome, avgExpense, maxExpenseMonth, maxExp };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="premium-card p-6 text-center text-muted-foreground">
        <p className="text-sm font-medium">মাসিক তুলনার জন্য পর্যাপ্ত লেনদেন নেই</p>
      </div>
    );
  }

  // Calculate dynamic bar size depending on count
  const dynamicBarSize = chartData.length <= 2 ? 38 : chartData.length <= 4 ? 28 : 20;

  return (
    <div className="premium-card p-0 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
      {/* Decorative gradient glow */}
      <div
        className="absolute -top-14 -right-12 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
      />

      {/* Header Band */}
      <div
        className="relative flex items-center justify-between px-5 py-4 border-b border-border/60"
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
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
              মাসিক জমা vs খরচ
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              শেষ {chartData.length} মাসের তুলনামূলক চিত্র
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-background/80 px-3 py-1.5 rounded-xl border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm" />
            <span className="text-xs font-semibold text-foreground">জমা</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 shadow-sm" />
            <span className="text-xs font-semibold text-foreground">খরচ</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              গড় মাসিক আয়
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
              ৳{stats.avgIncome.toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              গড় মাসিক খরচ
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
              ৳{stats.avgExpense.toLocaleString("bn-BD")}
            </span>
          </div>
          {stats.maxExpenseMonth && (
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                সর্বোচ্চ ব্যয়ের মাস
              </span>
              <span className="text-sm sm:text-base font-bold text-foreground">
                {stats.maxExpenseMonth}
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barGap={4}
              barSize={dynamicBarSize}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "14px",
                  fontSize: "13px",
                  padding: "12px 14px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => [
                  <span className="font-bold text-sm" style={{ color: name === "income" ? "#10B981" : "#EF4444" }}>
                    ৳{value.toLocaleString("bn-BD")}
                  </span>,
                  name === "income" ? "জমা" : "খরচ",
                ]}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 700, marginBottom: "4px" }}
              />
              <Bar dataKey="income" name="income" fill="#10B981" radius={[8, 8, 2, 2]} />
              <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MonthlyChart;
