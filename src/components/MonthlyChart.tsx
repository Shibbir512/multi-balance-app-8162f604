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
    <div className="premium-card p-4 mb-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--action-btn-bg)' }}>
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <p className="text-xs font-bold text-foreground">মাসিক আয় vs খরচ</p>
      </div>
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
                name === "income" ? "আয়" : "খরচ",
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
          <span className="text-[10px] text-muted-foreground">আয়</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--destructive))]" />
          <span className="text-[10px] text-muted-foreground">খরচ</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyChart;
