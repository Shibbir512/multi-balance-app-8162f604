import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Download,
  Calendar,
  Filter,
  X,
  Search,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import MonthlyChart from "./MonthlyChart";
import CategoryBreakdownTable from "./CategoryBreakdownTable";
import AdvancedExport from "./AdvancedExport";
import { getCategoryConfig } from "@/lib/categoryColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note?: string | null;
  categories?: { name: string } | null;
  accounts?: { name: string } | null;
  time?: string | null;
}

interface ReportsViewProps {
  ledgerName: string;
  transactions: Transaction[];
  categories: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string }[];
  onEditTx?: (tx: Transaction) => void;
  onDeleteTx?: (id: string) => void;
}

const MONTHS_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const formatBengaliDate = (dateStr: string) => {
  if (!dateStr) return { day: "—", monthYear: "—", weekday: "" };
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toLocaleString("bn-BD");
    const monthYear = format(d, "MMMM yyyy", { locale: bn });
    const weekday = format(d, "EEEE", { locale: bn });
    return { day, monthYear, weekday };
  } catch {
    return { day: dateStr, monthYear: "", weekday: "" };
  }
};

export const ReportsView = ({
  ledgerName,
  transactions,
  categories,
  accounts,
  onEditTx,
}: ReportsViewProps) => {
  // Preset filter: "all" | "this-month" | "last-month" | "this-year" | "custom"
  const [periodPreset, setPeriodPreset] = useState<"all" | "this-month" | "last-month" | "this-year" | "custom">("all");
  
  // Custom filter states
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination / Display limit
  const [displayLimit, setDisplayLimit] = useState(25);

  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYearStr = String(now.getFullYear());
  
  // Last month YYYY-MM
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthYm = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // Years list for filter
  const years = useMemo(() => {
    const currYear = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(currYear - i));
  }, []);

  // Category names list
  const catNames = useMemo(() => {
    return Array.from(new Set(categories.map((c) => c.name))).filter(Boolean);
  }, [categories]);

  // Handle Preset selection
  const handleSelectPreset = (preset: "all" | "this-month" | "last-month" | "this-year" | "custom") => {
    setPeriodPreset(preset);
    setDisplayLimit(25);
    if (preset !== "custom") {
      setFilterMonth("all");
      setFilterYear("all");
      setFilterCategory("all");
      setFilterType("all");
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleResetFilters = () => {
    setPeriodPreset("all");
    setFilterMonth("all");
    setFilterYear("all");
    setFilterCategory("all");
    setFilterType("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setDisplayLimit(25);
  };

  const isCustomFiltered =
    periodPreset === "custom" &&
    (filterMonth !== "all" ||
      filterYear !== "all" ||
      filterCategory !== "all" ||
      filterType !== "all" ||
      Boolean(dateFrom) ||
      Boolean(dateTo));

  const hasAnyFilter = periodPreset !== "all" || searchQuery !== "" || isCustomFiltered;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = [...(transactions || [])];

    // Presets
    if (periodPreset === "this-month") {
      list = list.filter((t) => t.date.startsWith(currentYm));
    } else if (periodPreset === "last-month") {
      list = list.filter((t) => t.date.startsWith(lastMonthYm));
    } else if (periodPreset === "this-year") {
      list = list.filter((t) => t.date.startsWith(currentYearStr));
    } else if (periodPreset === "custom") {
      if (filterMonth !== "all") {
        list = list.filter((t) => {
          const [, m] = t.date.split("-");
          return m === filterMonth;
        });
      }
      if (filterYear !== "all") {
        list = list.filter((t) => {
          const [y] = t.date.split("-");
          return y === filterYear;
        });
      }
      if (filterCategory !== "all") {
        list = list.filter((t) => (t.categories as { name?: string })?.name === filterCategory);
      }
      if (filterType !== "all") {
        list = list.filter((t) => t.type === filterType);
      }
      if (dateFrom) {
        list = list.filter((t) => t.date >= dateFrom);
      }
      if (dateTo) {
        list = list.filter((t) => t.date <= dateTo);
      }
    }

    // Search query within note or category
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const cat = (t.categories as { name?: string })?.name?.toLowerCase() || "";
        const note = t.note?.toLowerCase() || "";
        const acc = (t.accounts as { name?: string })?.name?.toLowerCase() || "";
        return cat.includes(q) || note.includes(q) || acc.includes(q);
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [
    transactions,
    periodPreset,
    currentYm,
    lastMonthYm,
    currentYearStr,
    filterMonth,
    filterYear,
    filterCategory,
    filterType,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // Derived Financial Metrics
  const incomeTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.type === "income"),
    [filteredTransactions]
  );
  const expenseTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.type === "expense"),
    [filteredTransactions]
  );

  const totalIncome = useMemo(
    () => incomeTransactions.reduce((s, t) => s + t.amount, 0),
    [incomeTransactions]
  );
  const totalExpense = useMemo(
    () => expenseTransactions.reduce((s, t) => s + t.amount, 0),
    [expenseTransactions]
  );
  const netBalance = totalIncome - totalExpense;

  // Savings rate %
  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return Math.round((netBalance / totalIncome) * 100);
  }, [totalIncome, netBalance]);

  // Top spending category
  const topExpenseCategory = useMemo(() => {
    if (!expenseTransactions.length) return null;
    const map = new Map<string, number>();
    expenseTransactions.forEach((t) => {
      const name = (t.categories as { name?: string })?.name || "অন্যান্য";
      map.set(name, (map.get(name) || 0) + t.amount);
    });
    let topName = "";
    let topAmt = 0;
    map.forEach((amt, name) => {
      if (amt > topAmt) {
        topAmt = amt;
        topName = name;
      }
    });
    const percentage = totalExpense > 0 ? Math.round((topAmt / totalExpense) * 100) : 0;
    return { name: topName, amount: topAmt, percentage };
  }, [expenseTransactions, totalExpense]);

  const displayedTransactions = filteredTransactions.slice(0, displayLimit);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ═══ 1. TOP HERO HEADER & EXPORT BAR ═══ */}
      <div className="premium-card p-5 sm:p-6 bg-gradient-to-br from-background via-background to-primary/5 border border-border/70 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wide">
                অ্যানালিটিক্স ও অডিট
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {ledgerName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              আর্থিক রিপোর্ট ও বিশ্লেষণ
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              আপনার সমস্ত জমা-খরচের স্পষ্ট পরিসংখ্যান, ক্যাটাগরি বিশ্লেষণ এবং এক্সপোর্ট
            </p>
          </div>

          {/* Export Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <AdvancedExport
              ledgerName={ledgerName}
              transactions={filteredTransactions as any}
              categories={categories}
            />
          </div>
        </div>

        {/* ═══ PERIOD FILTER CHIPS ═══ */}
        <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleSelectPreset("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                periodPreset === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              সব সময়
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("this-month")}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                periodPreset === "this-month"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              চলতি মাস
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("last-month")}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                periodPreset === "last-month"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              গত মাস
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("this-year")}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                periodPreset === "this-year"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              এই বছর
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("custom")}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                periodPreset === "custom"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              কাস্টম ফিল্টার
            </button>
          </div>

          {/* Reset Filters if any active */}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              ফিল্টার রিসেট
            </button>
          )}
        </div>

        {/* Custom Filter Controls Panel (Collapsible) */}
        {periodPreset === "custom" && (
          <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-down">
            {/* Month Filter */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">মাস</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-medium">
                  <SelectValue placeholder="সব মাস" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব মাস</SelectItem>
                  {MONTHS_BN.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">সাল</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-medium">
                  <SelectValue placeholder="সব সাল" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব সাল</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">ক্যাটাগরি</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-medium">
                  <SelectValue placeholder="সব ক্যাটাগরি" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                  {catNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">ধরণ</label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-medium">
                  <SelectValue placeholder="সব ধরণ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব লেনদেন</SelectItem>
                  <SelectItem value="income">শুধু জমা (Income)</SelectItem>
                  <SelectItem value="expense">শুধু খরচ (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground block mb-1">শুরুর তারিখ</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 text-xs sm:text-sm rounded-xl font-medium"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground block mb-1">শেষ তারিখ</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 text-xs sm:text-sm rounded-xl font-medium"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. HIGH-IMPACT KPI SUMMARY CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="premium-card p-5 bg-background relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">মোট জমা</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mb-2">
            ৳{totalIncome.toLocaleString("bn-BD")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{incomeTransactions.length}টি এন্ট্রি</span>
            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md font-bold">
              আয়
            </span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="premium-card p-5 bg-background relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">মোট খরচ</span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight leading-none mb-2">
            ৳{totalExpense.toLocaleString("bn-BD")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{expenseTransactions.length}টি এন্ট্রি</span>
            <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md font-bold">
              ব্যয়
            </span>
          </div>
        </div>

        {/* Net Savings / Balance Card */}
        <div className="premium-card p-5 bg-background relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all">
          <div
            className={`absolute top-0 left-0 w-full h-1 ${
              netBalance >= 0 ? "bg-violet-500" : "bg-amber-500"
            }`}
          />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">নীট সঞ্চয় / ব্যালেন্স</span>
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none mb-2 ${
              netBalance >= 0
                ? "text-violet-600 dark:text-violet-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {netBalance >= 0 ? "+" : "-"}৳{Math.abs(netBalance).toLocaleString("bn-BD")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>
              {totalIncome > 0 ? `সঞ্চয়ের হার ${savingsRate}%` : "আয়ের তথ্য নেই"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                netBalance >= 0
                  ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
              }`}
            >
              {netBalance >= 0 ? "উদ্বৃত্ত" : "ঘাটতি"}
            </span>
          </div>
        </div>

        {/* Top Expense Category Card */}
        <div className="premium-card p-5 bg-background relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">প্রধান খরচের খাত</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          {topExpenseCategory ? (
            <>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground truncate tracking-tight leading-none mb-2">
                {topExpenseCategory.name}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>৳{topExpenseCategory.amount.toLocaleString("bn-BD")}</span>
                <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold">
                  {topExpenseCategory.percentage}% ব্যয়
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-muted-foreground mb-2">কোনো খরচ নেই</p>
              <p className="text-xs text-muted-foreground">খরচ যোগ করলে আপডেট হবে</p>
            </>
          )}
        </div>
      </div>

      {/* ═══ 3. TWO-COLUMN RESPONSIVE ANALYTICS SECTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Monthly Trend Chart */}
        <div className="lg:col-span-7">
          <MonthlyChart transactions={filteredTransactions} />
        </div>

        {/* Right Column (5 cols): Category Breakdown */}
        <div className="lg:col-span-5">
          <CategoryBreakdownTable transactions={filteredTransactions} />
        </div>
      </div>

      {/* ═══ 4. FILTERED DETAILED TRANSACTIONS LEDGER ═══ */}
      <div className="premium-card p-0 overflow-hidden relative shadow-sm border border-border/70">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  লেনদেনের বিস্তারিত বিবরণী
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                  {filteredTransactions.length}টি
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                ফিল্টারকৃত সকল আয় ও ব্যয়ের তালিকা
              </p>
            </div>
          </div>

          {/* Search bar inside transaction list */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="বিবরণ বা ক্যাটাগরি খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm rounded-xl bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Transaction Table / List */}
        <div className="divide-y divide-border/50">
          {displayedTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">কোনো লেনদেন পাওয়া যায়নি</p>
              <p className="text-xs">ফিল্টারের সময়সীমা বা সার্চ কুয়েরি পরিবর্তন করে দেখুন</p>
            </div>
          ) : (
            displayedTransactions.map((tx) => {
              const isIncome = tx.type === "income";
              const catName = (tx.categories as { name?: string })?.name || "অন্যান্য";
              const accName = (tx.accounts as { name?: string })?.name;
              const config = getCategoryConfig(catName, tx.type as any);
              const Icon = config.icon;
              const { day, monthYear, weekday } = formatBengaliDate(tx.date);

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTx?.(tx)}
                  className="p-3.5 sm:p-4 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Left: Date Badge + Icon + Category & Note */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Date Badge */}
                    <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/50 flex flex-col items-center justify-center shrink-0 text-center">
                      <span className="text-sm font-extrabold text-foreground leading-none">
                        {day}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate max-w-full px-1">
                        {monthYear.split(" ")[0]}
                      </span>
                    </div>

                    {/* Category Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: config.bg, color: config.text }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {catName}
                        </p>
                        {accName && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {accName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{weekday}</span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="text-foreground/80 font-medium truncate max-w-[200px] sm:max-w-md">
                              {tx.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Arrow */}
                  <div className="text-right shrink-0 flex items-center gap-2.5">
                    <div>
                      <p
                        className={`text-base sm:text-lg font-bold tracking-tight ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                      </p>
                      {tx.time && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {tx.time}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Pagination Controls */}
        {filteredTransactions.length > displayedTransactions.length && (
          <div className="p-4 bg-muted/20 border-t border-border/50 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              মোট {filteredTransactions.length}টির মধ্যে {displayedTransactions.length}টি প্রদর্শিত
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 25)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                আরো ২৫টি দেখুন
              </button>
              <button
                type="button"
                onClick={() => setDisplayLimit(filteredTransactions.length)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-border hover:bg-muted text-foreground transition-colors"
              >
                সব {filteredTransactions.length}টি একসাথে দেখুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
