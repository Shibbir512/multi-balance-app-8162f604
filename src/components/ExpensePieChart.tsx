import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface Transaction {
  date: string;
  type: string;
  amount: number;
  categories?: { name: string } | null;
}

interface ExpensePieChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "hsl(252, 56%, 57%)",
  "hsl(0, 62%, 48%)",
  "hsl(152, 55%, 38%)",
  "hsl(30, 80%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(45, 85%, 50%)",
  "hsl(340, 65%, 50%)",
];

const ExpensePieChart = ({ transactions }: ExpensePieChartProps) => {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = (t.categories as any)?.name || "অন্যান্য";
        map.set(cat, (map.get(cat) || 0) + t.amount);
      });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) return null;

  return (
    <div className="premium-card p-4 mb-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--action-btn-bg)' }}>
          <PieIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <p className="text-xs font-bold text-foreground">খরচের ক্যাটাগরি বিশ্লেষণ</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={55}
                dataKey="value"
                stroke="none"
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '11px',
                  boxShadow: 'var(--shadow-card)',
                }}
                formatter={(value: number) => [`৳${value.toLocaleString("bn-BD")}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-1.5 overflow-hidden">
          {chartData.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[11px] text-muted-foreground truncate flex-1">{d.name}</span>
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
          {chartData.length > 5 && (
            <p className="text-[10px] text-muted-foreground">+{chartData.length - 5} আরও</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensePieChart;
