import { TrendingUp, TrendingDown, Wallet, BarChart3, ChevronRight } from "lucide-react";
import { useMemo } from "react";

interface Transaction {
  date: string;
  type: string;
  amount: number;
  categories?: { name: string } | null;
}

interface QuickOverviewProps {
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
}

const QuickOverview = ({ transactions, totalIncome, totalExpense }: QuickOverviewProps) => {
  const { incomeCount, expenseCount, dailyAverage, highestCategory } = useMemo(() => {
    let iCount = 0;
    let eCount = 0;
    const expenseByCategory = new Map<string, number>();

    let minDate = new Date().getTime();
    let maxDate = 0;

    transactions.forEach(t => {
      const tTime = new Date(t.date).getTime();
      if (tTime < minDate) minDate = tTime;
      if (tTime > maxDate) maxDate = tTime;

      if (t.type === "income") {
        iCount++;
      } else if (t.type === "expense") {
        eCount++;
        const cat = (t.categories as any)?.name || "অন্যান্য";
        expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + t.amount);
      }
    });

    // Calculate days difference
    let daysCount = 1;
    if (maxDate >= minDate && transactions.length > 0) {
      daysCount = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    }
    const avg = totalExpense / daysCount;

    let highestCat = { name: "নেই", amount: 0, percentage: 0 };
    if (expenseByCategory.size > 0) {
      const sorted = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);
      const topCat = sorted[0];
      highestCat = {
        name: topCat[0],
        amount: topCat[1],
        percentage: totalExpense > 0 ? Math.round((topCat[1] / totalExpense) * 100) : 0
      };
    }

    return {
      incomeCount: iCount,
      expenseCount: eCount,
      dailyAverage: avg,
      highestCategory: highestCat
    };
  }, [transactions, totalExpense]);

  return (
    <div className="bg-white dark:bg-[#172033] rounded-[16px] lg:rounded-[18px] p-[16px] lg:p-[20px] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_rgba(16,24,40,0.06)] dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <h3 className="text-[18px] lg:text-[20px] font-semibold text-[#172033] dark:text-[#F8FAFC]">দ্রুত পর্যালোচনা</h3>
        <ChevronRight className="w-5 h-5 text-[#98A2B3] dark:text-[#64748B]" strokeWidth={1.5} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        {/* Tile 1: Income */}
        <div className="bg-[#F0FDF4] dark:bg-[#1E293B] dark:border dark:border-[rgba(255,255,255,0.06)] rounded-[14px] lg:rounded-[16px] p-3 lg:p-[14px] flex flex-col justify-between">
          <div className="w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] rounded-xl flex items-center justify-center bg-white/60 dark:bg-[rgba(22,163,74,0.14)] mb-2 shrink-0">
            <TrendingUp className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px] text-[#16A34A] dark:text-[#4ADE80]" />
          </div>
          <div>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#15803D] dark:text-[#CBD5E1] opacity-80 dark:opacity-100 mb-0.5">এই মাসে আয়</p>
            <p className="text-[19px] lg:text-[21px] font-bold text-[#16A34A] dark:text-[#F8FAFC] leading-tight break-words">
              ৳{totalIncome.toLocaleString("bn-BD")}
            </p>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#15803D] dark:text-[#94A3B8] opacity-70 dark:opacity-100 mt-1 leading-tight">
              {incomeCount} টি লেনদেন
            </p>
          </div>
        </div>

        {/* Tile 2: Expense */}
        <div className="bg-[#FFF1F2] dark:bg-[#1E293B] dark:border dark:border-[rgba(255,255,255,0.06)] rounded-[14px] lg:rounded-[16px] p-3 lg:p-[14px] flex flex-col justify-between">
          <div className="w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] rounded-xl flex items-center justify-center bg-white/60 dark:bg-[rgba(239,68,68,0.14)] mb-2 shrink-0">
            <TrendingDown className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px] text-[#E5484D] dark:text-[#F87171]" />
          </div>
          <div>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#BE123C] dark:text-[#CBD5E1] opacity-80 dark:opacity-100 mb-0.5">এই মাসে খরচ</p>
            <p className="text-[19px] lg:text-[21px] font-bold text-[#E5484D] dark:text-[#F8FAFC] leading-tight break-words">
              ৳{totalExpense.toLocaleString("bn-BD")}
            </p>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#BE123C] dark:text-[#94A3B8] opacity-70 dark:opacity-100 mt-1 leading-tight">
              {expenseCount} টি লেনদেন
            </p>
          </div>
        </div>

        {/* Tile 3: Daily Average */}
        <div className="bg-[#EEF5FF] dark:bg-[#1E293B] dark:border dark:border-[rgba(255,255,255,0.06)] rounded-[14px] lg:rounded-[16px] p-3 lg:p-[14px] flex flex-col justify-between">
          <div className="w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] rounded-xl flex items-center justify-center bg-white/60 dark:bg-[rgba(59,130,246,0.14)] mb-2 shrink-0">
            <Wallet className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px] text-[#2563EB] dark:text-[#60A5FA]" />
          </div>
          <div>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#1D4ED8] dark:text-[#CBD5E1] opacity-80 dark:opacity-100 mb-0.5">গড় দৈনিক খরচ</p>
            <p className="text-[19px] lg:text-[21px] font-bold text-[#2563EB] dark:text-[#F8FAFC] leading-tight break-words">
              ৳{Math.round(dailyAverage).toLocaleString("bn-BD")}
            </p>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#1D4ED8] dark:text-[#94A3B8] opacity-70 dark:opacity-100 mt-1 leading-tight">
              {transactions.length > 0 ? "প্রতিদিনের হিসাব" : "পর্যাপ্ত তথ্য নেই"}
            </p>
          </div>
        </div>

        {/* Tile 4: Highest Expense */}
        <div className="bg-[#F5F3FF] dark:bg-[#1E293B] dark:border dark:border-[rgba(255,255,255,0.06)] rounded-[14px] lg:rounded-[16px] p-3 lg:p-[14px] flex flex-col justify-between">
          <div className="w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] rounded-xl flex items-center justify-center bg-white/60 dark:bg-[rgba(124,77,255,0.14)] mb-2 shrink-0">
            <BarChart3 className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px] text-[#7C3AED] dark:text-[#A78BFA]" />
          </div>
          <div>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#6D28D9] dark:text-[#CBD5E1] opacity-80 dark:opacity-100 mb-0.5">সর্বাধিক খরচ</p>
            <p className="text-[19px] lg:text-[21px] font-bold text-[#7C3AED] dark:text-[#F8FAFC] leading-tight break-words">
              {highestCategory.name}
            </p>
            <p className="text-[12px] lg:text-[13px] font-medium text-[#6D28D9] dark:text-[#94A3B8] opacity-70 dark:opacity-100 mt-1 leading-tight break-words">
              {highestCategory.percentage}% (৳{highestCategory.amount.toLocaleString("bn-BD")})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickOverview;
