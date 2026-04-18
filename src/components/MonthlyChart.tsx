import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";

interface Transaction {
  date: string;
  type: string;
  amount: number;
}

interface MonthlyChartProps {
  transactions: Transaction[];
}

const MONTH_NAMES_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

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
        const month = parseInt(key.split("-")[1], 10) - 1;
        return { name: MONTH_NAMES_BN[month], income: val.income, expense: val.expense };
      });
  }, [transactions]);

  if (chartData.length < 2) return null;

  return (
    <div className="premium-card p-0 mb-3 overflow-hidden relative animate-fade-in-up">
      {/* Decorative gradient halo */}
      <div
        className="absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
      />
      {/* Header band */}
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: '0 4px 12px -2px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-extrabold text-foreground leading-tight">
            মাসিক জমা vs খরচ
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            শেষ {chartData.length} মাসের তুলনা
          </p>
        </div>
      </div>

      <div className="relative p-4">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '11px',
                  boxShadow: 'var(--shadow-card)',
                }}
                formatter={(value: number, name: string) => [
                  `৳${value.toLocaleString("bn-BD")}`,
                  name === "income" ? "জমা" : "খরচ",
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--success))]" />
            <span className="text-[10px] text-muted-foreground font-medium">জমা</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--destructive))]" />
            <span className="text-[10px] text-muted-foreground font-medium">খরচ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyChart;
