import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";

interface FinancialSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  monthlyBudget?: number;
}

const FinancialSummaryCards = ({
  totalIncome,
  totalExpense,
  totalBalance,
  monthlyBudget = 0,
}: FinancialSummaryCardsProps) => {
  const budgetSpent = totalExpense;
  const budgetPercentage = monthlyBudget > 0 ? Math.min((budgetSpent / monthlyBudget) * 100, 100) : 0;
  const hasBudget = monthlyBudget > 0;

  const baseCardClass = "bg-[#FFFFFF] dark:bg-[#172033] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.08)] rounded-[16px] p-[20px] flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)] hover:border-[#D0D5DD] dark:hover:border-[rgba(255,255,255,0.12)] min-h-[128px] shadow-[0_4px_16px_rgba(16,24,40,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.22)]";

  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-6">
      {/* Income Card */}
      <div className={baseCardClass}>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#16A34A] dark:bg-[#4ADE80] opacity-80" />
        <div className="flex flex-col h-full justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center bg-[#EAF8F0] dark:bg-[rgba(22,163,74,0.14)] shrink-0">
              <TrendingUp className="w-[20px] h-[20px] text-[#16A34A] dark:text-[#4ADE80]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#475467] dark:text-[#94A3B8]">মোট আয়</span>
          </div>
          <p className="text-[28px] lg:text-[30px] font-bold text-[#16A34A] dark:text-[#4ADE80] leading-none truncate">
            ৳{totalIncome.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      {/* Expense Card */}
      <div className={baseCardClass}>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#E5484D] dark:bg-[#F87171] opacity-80" />
        <div className="flex flex-col h-full justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center bg-[#FFF0F1] dark:bg-[rgba(239,68,68,0.14)] shrink-0">
              <TrendingDown className="w-[20px] h-[20px] text-[#E5484D] dark:text-[#F87171]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#475467] dark:text-[#94A3B8]">মোট খরচ</span>
          </div>
          <p className="text-[28px] lg:text-[30px] font-bold text-[#E5484D] dark:text-[#F87171] leading-none truncate">
            ৳{totalExpense.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <div className={baseCardClass}>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D4AFF] dark:bg-[#A78BFA] opacity-80" />
        <div className="flex flex-col h-full justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center bg-[#F0EDFF] dark:bg-[rgba(124,77,255,0.14)] shrink-0">
              <Wallet className="w-[20px] h-[20px] text-[#6D4AFF] dark:text-[#A78BFA]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#475467] dark:text-[#94A3B8]">বর্তমান ব্যালেন্স</span>
          </div>
          <p className={`text-[28px] lg:text-[30px] font-bold leading-none truncate ${totalBalance < 0 ? 'text-[#E5484D] dark:text-[#F87171]' : 'text-[#6D4AFF] dark:text-[#4ADE80]'}`}>
            ৳{totalBalance.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      {/* Budget Card */}
      <div className={baseCardClass}>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#2563EB] dark:bg-[#60A5FA] opacity-80" />
        <div className="flex flex-col h-full justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center bg-[#EEF5FF] dark:bg-[rgba(59,130,246,0.14)] shrink-0">
              <Target className="w-[20px] h-[20px] text-[#2563EB] dark:text-[#60A5FA]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#475467] dark:text-[#94A3B8]">মাসিক বাজেট</span>
          </div>
          
          {hasBudget ? (
            <div>
              <p className="text-[28px] lg:text-[30px] font-bold text-[#172033] dark:text-[#F8FAFC] leading-none truncate">
                ৳{monthlyBudget.toLocaleString("bn-BD")}
              </p>
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-medium text-[#667085] dark:text-[#94A3B8]">ব্যয় হয়েছে</span>
                  <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA]">{budgetPercentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#E8EAF2] dark:bg-[rgba(255,255,255,0.06)] rounded-full h-[6px] overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${budgetPercentage > 90 ? 'bg-[#E5484D] dark:bg-[#F87171]' : 'bg-[#2563EB] dark:bg-[#60A5FA]'}`}
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[24px] lg:text-[26px] font-semibold text-[#94A3B8] leading-none truncate">
                —
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1.5 font-medium">বাজেট সেট করা নেই</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryCards;
