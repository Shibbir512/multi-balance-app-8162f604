import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { Coffee } from "lucide-react"; // Subtle icon for empty state

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
  periodSelector?: React.ReactNode;
  periodLabel?: string;
}

import { getCategoryConfig } from "../lib/categoryColors";

const getCategoryColor = (categoryName: string) => {
  return getCategoryConfig(categoryName, "expense").text;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 3}
      outerRadius={outerRadius + 5}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
    />
  );
};

const ExpensePieChart = ({ transactions, totalBalance = 0, onCategorySelect, selectedCategory, periodSelector, periodLabel }: ExpensePieChartProps) => {
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

    return sorted;
  }, [transactions]);

  const totalExpense = chartData.reduce((s, d) => s + d.value, 0);

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
    <div className="bg-white dark:bg-[#172033] rounded-[16px] lg:rounded-[18px] p-[16px] lg:p-[20px] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] sm:text-[18px] lg:text-[20px] font-semibold text-[#172033] dark:text-[#F8FAFC]">খরচের বিশ্লেষণ</h3>
        </div>
        {periodSelector && (
          <div className="w-full min-w-0">
            {periodSelector}
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F6F7FC] dark:bg-[#1E293B] flex items-center justify-center mb-3">
            <Coffee className="w-6 h-6 text-[#98A2B3] dark:text-[#94A3B8] opacity-70" strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-semibold text-[#172033] dark:text-[#F8FAFC]">এই সময়ে কোনো খরচ নেই</h3>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          {/* Donut Chart */}
          <div className="flex justify-center md:justify-start shrink-0">
            <div className="relative w-[130px] md:w-[200px] lg:w-[215px] h-[130px] md:h-[215px] lg:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    dataKey="value"
                    stroke="none"
                    paddingAngle={3}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onClick={handleClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={getCategoryColor(entry.name)}
                        opacity={selectedCategory && entry.name !== selectedCategory ? 0.3 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E8EAF2',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: '#172033',
                      boxShadow: '0 8px 24px rgba(16,24,40,0.08)',
                      fontWeight: 500,
                    }}
                    itemStyle={{
                      color: '#172033',
                    }}
                    labelStyle={{
                      color: '#667085',
                    }}
                    formatter={(value: number) => [`৳${value.toLocaleString("bn-BD")}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 md:px-3">
                <div className="flex flex-col items-center justify-center gap-0.5 md:gap-1 w-full text-center">
                  <span className="text-[10px] md:text-[12px] text-[#667085] dark:text-[#94A3B8] font-medium leading-tight">মোট খরচ</span>
                  <span className="text-[14px] md:text-[18px] lg:text-[20px] font-bold text-[#172033] dark:text-[#F8FAFC] leading-none max-w-full truncate px-1" title={`৳${totalExpense.toLocaleString("bn-BD")}`}>
                    ৳{totalExpense >= 1000000 ? (totalExpense / 100000).toLocaleString("bn-BD", { maximumFractionDigits: 1 }) + ' লক্ষ' : totalExpense.toLocaleString("bn-BD")}
                  </span>
                  {periodLabel && (
                    <span className="text-[9px] md:text-[11px] text-[#667085] dark:text-[#94A3B8] bg-[#F6F7FC] dark:bg-[#1E293B] px-1.5 md:px-2 py-0.5 rounded-full truncate max-w-full leading-tight">
                      {periodLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category Legend */}
          <div className="w-full flex-1 min-w-0 flex flex-col gap-[3px] overflow-y-auto max-h-[160px] md:max-h-[215px] lg:max-h-[250px] no-scrollbar pr-1">
            {chartData.map((d, i) => (
              <button
                key={d.name}
                onClick={() => handleClick(null, i)}
                className={`grid grid-cols-[8px_minmax(0,1fr)_30px_60px] md:grid-cols-[9px_minmax(0,1fr)_38px_72px] items-center gap-1.5 md:gap-2.5 w-full py-1.5 px-1.5 md:px-2 rounded-lg hover:bg-[#F6F7FC] dark:hover:bg-[#1E293B] transition-colors text-left ${
                  selectedCategory && selectedCategory !== d.name ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style={{ background: getCategoryColor(d.name) }} />
                <span className="text-[10.5px] md:text-[13px] text-[#475467] dark:text-[#CBD5E1] font-medium truncate" title={d.name}>{d.name}</span>
                <span className="text-[10px] md:text-[12.5px] font-semibold text-[#172033] dark:text-[#F8FAFC] text-right">
                  {totalExpense > 0 ? Math.round((d.value / totalExpense) * 100) : 0}%
                </span>
                <span className="text-[10px] md:text-[12.5px] font-medium text-[#667085] dark:text-[#94A3B8] text-right truncate" title={`৳${d.value.toLocaleString("bn-BD")}`}>
                  ৳{d.value.toLocaleString("bn-BD")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePieChart;
