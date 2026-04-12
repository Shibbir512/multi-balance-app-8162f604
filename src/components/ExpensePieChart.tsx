import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { useState } from "react";

interface Transaction {
  date: string;
  type: string;
  amount: number;
  categories?: { name: string } | null;
}

interface ExpensePieChartProps {
  transactions: Transaction[];
  totalBalance?: number;
  onCategorySelect?: (category: string | null) => void;
  selectedCategory?: string | null;
}

const COLORS = [
  "hsl(252, 56%, 57%)",
  "hsl(340, 65%, 50%)",
  "hsl(152, 55%, 38%)",
  "hsl(30, 80%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(45, 85%, 50%)",
  "hsl(170, 60%, 42%)",
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
    />
  );
};

const ExpensePieChart = ({ transactions, totalBalance = 0, onCategorySelect, selectedCategory }: ExpensePieChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = (t.categories as any)?.name || "অন্যান্য";
        map.set(cat, (map.get(cat) || 0) + t.amount);
      });

    const sorted = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Group beyond 5 into "অন্যান্য"
    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const othersTotal = sorted.slice(5).reduce((s, d) => s + d.value, 0);
      if (othersTotal > 0) top5.push({ name: "অন্যান্য", value: othersTotal });
      return top5;
    }
    return sorted;
  }, [transactions]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) return null;

  const handleClick = (_: any, index: number) => {
    const cat = chartData[index]?.name;
    if (onCategorySelect) {
      if (selectedCategory === cat) {
        onCategorySelect(null);
        setActiveIndex(undefined);
      } else {
        onCategorySelect(cat);
        setActiveIndex(index);
      }
    }
  };

  return (
    <div className="hero-card p-5 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                paddingAngle={3}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    opacity={selectedCategory && chartData[i].name !== selectedCategory ? 0.3 : 1}
                  />
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
          {/* Center Balance */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">ব্যালেন্স</p>
            <p className="text-lg font-extrabold text-foreground leading-tight">
              ৳{totalBalance.toLocaleString("bn-BD")}
            </p>
          </div>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {chartData.map((d, i) => (
          <button
            key={d.name}
            onClick={() => handleClick(null, i)}
            className={`flex items-center gap-1.5 transition-opacity duration-200 ${
              selectedCategory && selectedCategory !== d.name ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[11px] text-muted-foreground">{d.name}</span>
            <span className="text-[11px] font-bold text-foreground">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExpensePieChart;
