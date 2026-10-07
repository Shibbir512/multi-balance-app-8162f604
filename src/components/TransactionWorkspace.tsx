import { Search, Filter, MoreHorizontal, Pencil, Trash2, Eye, Wallet, FileText, Database, TrendingUp, ChevronLeft, ChevronRight, ShoppingCart, Zap, Car, GraduationCap, Coffee, Activity, Wifi, BookHeart, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const getTxWatermarkIcon = (tx: any) => {
  const catName = (tx.categories as { name: string })?.name || "";
  const note = tx.note?.trim() || "";
  
  if (note.includes("আনারস") || note.includes("বাজার") || note.includes("সবজি")) return ShoppingCart;
  if (note.includes("বিদ্যুৎ") || note.includes("গ্যাস") || note.includes("পানি")) return Zap;
  if (note.includes("বাস") || note.includes("ভাড়া") || note.includes("রিকশা") || note.includes("উবার")) return Car;
  if (note.includes("মাদরাসা") || note.includes("স্কুল") || note.includes("টিউশন")) return GraduationCap;
  if (note.includes("খাবার") || note.includes("রেস্টুরেন্ট") || note.includes("চা")) return Coffee;
  if (note.includes("ডাক্তার") || note.includes("ওষুধ") || note.includes("হাসপাতাল")) return Activity;
  if (note.includes("ইন্টারনেট") || note.includes("ওয়াইফাই") || note.includes("এমবি")) return Wifi;
  if (note.includes("বই") || note.includes("কুরআন") || note.includes("ধর্মীয়")) return BookHeart;
  if (tx.type === "income" || note.includes("বেতন") || note.includes("আয়")) return TrendingDown; // Income arrow can be green trending down or up
  
  if (catName.includes("ব্যবসা")) return Wallet;
  if (catName.includes("খরচ") || tx.type === "expense") return FileText;
  if (catName.includes("জমা") && !note) return Database;
  if (tx.type === "income") return TrendingUp;
  return FileText;
};

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  note?: string;
  categories?: { name: string } | null;
  accounts?: { name: string } | null;
  time?: string;
}

interface TransactionWorkspaceProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterButton: React.ReactNode;
  monthSelector?: React.ReactNode;
}

import { getCategoryConfig } from "../lib/categoryColors";

const formatBengaliDateWorkspace = (dateStr: string) => {
  if (!dateStr) return { primary: "—", secondary: "—" };
  try {
    const d = new Date(dateStr);
    const primary = format(d, "dd MMMM", { locale: bn });
    const secondary = format(d, "EEE", { locale: bn });
    return { primary, secondary };
  } catch (e) {
    return { primary: dateStr, secondary: "" };
  }
};

const toBengaliNum = (num: number) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().split('').map(digit => /[0-9]/.test(digit) ? bengaliDigits[parseInt(digit)] : digit).join('');
};

const TransactionWorkspace = ({
  transactions,
  onEdit,
  onDelete,
  searchQuery,
  setSearchQuery,
  filterButton,
  monthSelector,
}: TransactionWorkspaceProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Internal search logic for the workspace UI since the user asked to not change business logic
  const searchedTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const note = tx.note?.toLowerCase() || "";
    const cat = tx.categories?.name?.toLowerCase() || "";
    const amt = tx.amount.toString();
    return note.includes(q) || cat.includes(q) || amt.includes(q);
  });

  const totalPages = Math.ceil(searchedTransactions.length / itemsPerPage);
  
  // Ensure current page is valid when search changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const displayedTransactions = searchedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white dark:bg-[#172033] rounded-[16px] lg:rounded-[18px] overflow-hidden flex flex-col h-full border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.08)]">
      
      {/* Header */}
      <div className="p-[20px] flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EEF0F5] dark:border-[rgba(255,255,255,0.06)]">
        <div>
          <h3 className="text-[16px] lg:text-[18px] font-bold text-[#172033] dark:text-[#F8FAFC]">
            সাম্প্রতিক লেনদেন <span className="text-[#667085] dark:text-[#94A3B8] font-semibold text-[14px]">({toBengaliNum(searchedTransactions.length)})</span>
          </h3>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Month Selector */}
          {monthSelector && (
            <div className="shrink-0">
              {monthSelector}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] dark:text-[#64748B]" />
            <input
              type="text"
              placeholder="লেনদেন খুঁজুন..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[38px] lg:h-[40px] w-full lg:w-[260px] pl-9 pr-4 rounded-xl border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-[#F9FAFB] dark:bg-[#1E293B] text-[13px] text-black dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all hover:border-[#D0D5DD] dark:hover:border-[#94A3B8]"
            />
          </div>

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-[38px] lg:h-[40px] px-3.5 lg:px-4 flex items-center gap-2 rounded-xl border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B] hover:bg-[#F9FAFB] dark:hover:bg-[#263449] active:bg-[#F3F4F6] text-[#475467] dark:text-[#CBD5E1] transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]">
                <Filter className="w-[16px] lg:w-[18px] h-[16px] lg:h-[18px]" />
                <span className="text-[13px] font-medium hidden sm:inline">ফিল্টার</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-1.5 rounded-[12px] shadow-md border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B]" align="end">
              {filterButton}
            </PopoverContent>
          </Popover>

          {/* More Menu */}
          <button 
            title="আরও অপশন"
            className="w-[38px] lg:w-[40px] h-[38px] lg:h-[40px] flex items-center justify-center rounded-xl border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B] hover:bg-[#F9FAFB] dark:hover:bg-[#263449] active:bg-[#F3F4F6] text-[#475467] dark:text-[#CBD5E1] transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] shrink-0"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden md:grid bg-[#FAFBFD] dark:bg-[#1E293B] h-[42px] lg:h-[46px] border-b border-[#EEF0F5] dark:border-[rgba(255,255,255,0.06)] grid-cols-[44px_100px_44px_1fr_130px_100px_36px] lg:grid-cols-[48px_110px_48px_1fr_150px_120px_36px] items-center px-[16px] gap-2 lg:gap-3">
        <div></div>
        <div className="text-[12px] lg:text-[13px] font-semibold text-[#667085] dark:text-[#CBD5E1]">তারিখ</div>
        <div></div>
        <div className="text-[12px] lg:text-[13px] font-semibold text-[#667085] dark:text-[#CBD5E1]">বিবরণ</div>
        <div className="text-[12px] lg:text-[13px] font-semibold text-[#667085] dark:text-[#CBD5E1] text-center">ক্যাটাগরি</div>
        <div className="text-[12px] lg:text-[13px] font-semibold text-[#667085] dark:text-[#CBD5E1] text-right">পরিমাণ</div>
        <div></div>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto no-scrollbar pb-2">
        {displayedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full bg-[#F6F7FC] flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-[#98A2B3] opacity-70" strokeWidth={2} />
            </div>
            <p className="text-[#667085] font-medium text-sm">কোনো লেনদেন পাওয়া যায়নি</p>
          </div>
        ) : (
          displayedTransactions.map((tx) => {
            const { primary, secondary } = formatBengaliDateWorkspace(tx.date);
            const WatermarkIcon = getTxWatermarkIcon(tx as any);
            const catName = tx.categories?.name || "অন্যান্য";
            const categoryConfig = getCategoryConfig(catName, tx.type as "income" | "expense");
            const CategoryIcon = categoryConfig.icon;
            
            return (
              <div 
                key={tx.id}
                className="border-b border-[#EEF0F5] dark:border-[rgba(255,255,255,0.04)] hover:bg-[#FAFAFF] dark:hover:bg-[#263449] transition-colors duration-150"
              >
                {/* ─── MOBILE LAYOUT ─── */}
                <div className="md:hidden flex items-center justify-between px-[16px] py-[14px]">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="w-[42px] h-[42px] rounded-[12px] shrink-0 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)]">
                      <WatermarkIcon className="w-[20px] h-[20px] opacity-70" style={{ color: tx.type === "income" ? '#16A34A' : '#E5484D' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#172033] dark:text-[#F8FAFC] truncate mb-0.5">
                        {tx.note?.trim() ? tx.note : catName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#94A3B8] truncate">
                        <span>{primary}</span>
                        <span className="w-1 h-1 rounded-full bg-[#D0D5DD] dark:bg-[#475569]"></span>
                        <span style={{ color: categoryConfig.text, fontWeight: 500 }}>{catName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-[15px] font-bold ${tx.type === "income" ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#E5484D] dark:text-[#F8FAFC]'}`}>
                      {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button title="অপশন" className="text-[#98A2B3] dark:text-[#CBD5E1] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] p-1 -mr-1 rounded-md active:bg-[#F3F4F6] transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 p-2 rounded-[12px] border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] shadow-md bg-white dark:bg-[#1E293B]">
                        <DropdownMenuItem onClick={() => onEdit(tx)} className="text-[14px] font-medium px-3 py-2.5 focus:bg-[#F7F5FF] dark:focus:bg-[#263449] focus:text-[#7C3AED] dark:focus:text-[#A78BFA] text-[#172033] dark:text-[#F8FAFC] cursor-pointer rounded-lg transition-colors flex items-center">
                          <Pencil className="w-4 h-4 mr-2" /> সম্পাদনা করুন
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(tx.id)} className="text-[14px] font-medium px-3 py-2.5 focus:bg-[#FFF1F2] focus:text-[#E5484D] text-[#E5484D] cursor-pointer rounded-lg transition-colors flex items-center mt-1">
                          <Trash2 className="w-4 h-4 mr-2" /> মুছে ফেলুন
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ─── DESKTOP LAYOUT ─── */}
                <div className="hidden md:grid h-[68px] lg:h-[72px] grid-cols-[44px_100px_44px_1fr_130px_100px_36px] lg:grid-cols-[48px_110px_48px_1fr_150px_120px_36px] items-center px-[16px] gap-2 lg:gap-3">
                  
                  {/* COLUMN 1: Type/Category Icon */}
                  <div className="flex items-center justify-center">
                    <div 
                      className="w-[36px] h-[36px] lg:w-[40px] lg:h-[40px] rounded-[10px] lg:rounded-[12px] shrink-0 flex items-center justify-center"
                      style={{ background: categoryConfig.bg, color: categoryConfig.text }}
                    >
                      <CategoryIcon className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px]" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* COLUMN 2: Date */}
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-[13px] lg:text-[14px] font-medium text-[#172033] dark:text-[#F8FAFC] truncate">{primary}</p>
                    <p className="text-[12px] text-[#667085] dark:text-[#94A3B8] truncate">{secondary}</p>
                  </div>

                  {/* COLUMN 3: Item Icon */}
                  <div className="flex items-center justify-center">
                    <div className="w-[34px] h-[34px] lg:w-[38px] lg:h-[38px] rounded-[10px] shrink-0 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)]">
                      <WatermarkIcon className="w-[18px] lg:w-[20px] h-[18px] lg:h-[20px] opacity-80" style={{ color: tx.type === "income" ? '#16A34A' : '#64748B' }} />
                    </div>
                  </div>

                  {/* COLUMN 4: Description */}
                  <div className="flex flex-col justify-center min-w-0 pr-2">
                    <p className="text-[14px] lg:text-[15px] font-semibold text-[#172033] dark:text-[#F8FAFC] truncate">
                      {tx.note?.trim() ? tx.note : catName}
                    </p>
                    <p className="text-[12px] text-[#667085] dark:text-[#94A3B8] truncate">
                      {tx.accounts?.name || "—"}
                    </p>
                  </div>

                  {/* COLUMN 5: Category Badge */}
                  <div className="flex justify-center">
                    <div 
                      className="h-[26px] lg:h-[30px] px-2.5 lg:px-3 rounded-full flex items-center justify-center truncate max-w-[100px] lg:max-w-[120px]"
                      style={{ background: categoryConfig.bg, color: categoryConfig.text }}
                    >
                      <span className="text-[12px] lg:text-[13px] font-medium truncate">{catName}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className={`text-[14px] lg:text-[15px] font-semibold ${tx.type === "income" ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#E5484D] dark:text-[#F8FAFC]'}`}>
                      {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button title="অপশন" className="w-[32px] lg:w-[36px] h-[32px] lg:h-[36px] rounded-lg flex items-center justify-center text-[#667085] dark:text-[#CBD5E1] hover:bg-[#F5F3FF] dark:hover:bg-[#1E293B] hover:text-[#7C3AED] transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 p-2 rounded-[12px] border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] shadow-md bg-white dark:bg-[#1E293B]">
                        <DropdownMenuItem onClick={() => onEdit(tx)} className="text-[14px] font-medium px-3 py-2.5 focus:bg-[#F7F5FF] dark:focus:bg-[#263449] focus:text-[#7C3AED] dark:focus:text-[#A78BFA] text-[#172033] dark:text-[#F8FAFC] cursor-pointer rounded-lg transition-colors flex items-center">
                          <Pencil className="w-4 h-4 mr-2" /> সম্পাদনা করুন
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(tx.id)} className="text-[14px] font-medium px-3 py-2.5 focus:bg-[#FFF1F2] focus:text-[#E5484D] text-[#E5484D] cursor-pointer rounded-lg transition-colors flex items-center mt-1">
                          <Trash2 className="w-4 h-4 mr-2" /> মুছে ফেলুন
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 0 && (
        <div className="h-[56px] lg:h-[64px] border-t border-[#EEF0F5] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#172033] flex items-center justify-between px-[16px] shrink-0">
          <p className="text-[13px] text-[#667085] dark:text-[#CBD5E1] font-medium hidden sm:block">
            মোট {toBengaliNum(searchedTransactions.length)}টি লেনদেন দেখানো হচ্ছে
          </p>
          <p className="text-[13px] text-[#667085] dark:text-[#CBD5E1] font-medium sm:hidden">
            {toBengaliNum(searchedTransactions.length)}টি লেনদেন
          </p>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-[36px] lg:w-[40px] h-[36px] lg:h-[40px] rounded-[8px] lg:rounded-[10px] flex items-center justify-center border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B] text-[#475467] dark:text-[#CBD5E1] hover:bg-[#F9FAFB] dark:hover:bg-[#263449] active:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                const isActive = page === currentPage;
                // Simple logic to show only nearby pages if too many (for small UI)
                if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                  if (page === 2 || page === totalPages - 1) return <span key={page} className="text-[#98A2B3] text-[12px]">...</span>;
                  return null;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-[32px] h-[32px] lg:w-[36px] lg:h-[36px] rounded-[8px] lg:rounded-[10px] flex items-center justify-center text-[13px] font-semibold transition-all active:scale-[0.98] ${
                      isActive 
                        ? 'bg-[#5B3FE4] dark:bg-[#7C4DFF] text-white shadow-[0_4px_10px_rgba(91,63,228,0.2)] dark:shadow-[0_4px_10px_rgba(124,77,255,0.2)]' 
                        : 'bg-white dark:bg-[#1E293B] border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] text-[#475467] dark:text-[#CBD5E1] hover:bg-[#F9FAFB] dark:hover:bg-[#263449]'
                    }`}
                  >
                    {toBengaliNum(page)}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-[36px] lg:w-[40px] h-[36px] lg:h-[40px] rounded-[8px] lg:rounded-[10px] flex items-center justify-center border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B] text-[#475467] dark:text-[#CBD5E1] hover:bg-[#F9FAFB] dark:hover:bg-[#263449] active:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionWorkspace;

