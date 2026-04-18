import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Pencil, ShoppingCart, Calculator, CreditCard, Tag, Trash2, X, ChevronDown, BarChart3, Calendar, Search, Clock, FileText, Check } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import GroceryModule from "@/components/GroceryModule";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";
import ZakatCalculator from "@/components/ZakatCalculator";
import TransactionFilters from "@/components/TransactionFilters";
import AdvancedExport from "@/components/AdvancedExport";
import CategoryBreakdownTable from "@/components/CategoryBreakdownTable";
import TransactionEditDialog from "@/components/TransactionEditDialog";
import CalculatorInput from "@/components/CalculatorInput";
import MonthlyChart from "@/components/MonthlyChart";
import ExpensePieChart from "@/components/ExpensePieChart";
import SwipeableCard from "@/components/SwipeableCard";

const BENGALI_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const formatBengaliDate = (dateStr: string, timeStr?: string | null) => {
  const [y, m, d] = dateStr.split("-");
  const day = parseInt(d).toLocaleString("bn-BD");
  const month = BENGALI_MONTHS[parseInt(m) - 1];
  const year = parseInt(y).toLocaleString("bn-BD").replace(/,/g, "");
  let result = `${day} ${month}, ${year}`;
  if (timeStr) {
    const [h, min] = timeStr.split(":");
    const hour = parseInt(h);
    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    const bengaliMin = parseInt(min).toLocaleString("bn-BD").padStart(2, "০");
    result += ` ${h12.toLocaleString("bn-BD")}:${bengaliMin} ${period}`;
  }
  return result;
};

type StatPeriod = "today" | "month" | "year" | "all";

const LedgerDetailPage = () => {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAccount, setTxAccount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNote, setTxNote] = useState("");
  const [txTime, setTxTime] = useState(new Date().toTimeString().slice(0, 5));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNoteSuggestions, setShowNoteSuggestions] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [editTx, setEditTx] = useState<Record<string, unknown> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [ledgerDropdownOpen, setLedgerDropdownOpen] = useState(false);
  const [statPeriod, setStatPeriod] = useState<StatPeriod>("all");
  const [chartCategory, setChartCategory] = useState<string | null>(null);

  const { data: ledger } = useQuery({
    queryKey: ["ledger", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledgers").select("*").eq("id", ledgerId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allLedgers } = useQuery({
    queryKey: ["ledgers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledgers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("ledger_id", ledgerId!);
      if (error) throw error;
      return data;
    },
  });

  // Default select last used account or "নগদ"
  useEffect(() => {
    if (accounts?.length && !txAccount) {
      const lastAccountId = localStorage.getItem(`lastAccount_${ledgerId}`);
      const lastAccount = lastAccountId ? accounts.find(a => a.id === lastAccountId) : null;
      if (lastAccount) {
        setTxAccount(lastAccount.id);
      } else {
        const nagad = accounts.find(a => a.name === "নগদ" || a.name.toLowerCase() === "cash");
        if (nagad) setTxAccount(nagad.id);
      }
    }
  }, [accounts, txAccount, ledgerId]);


  const { data: categories } = useQuery({
    queryKey: ["categories", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("ledger_id", ledgerId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, accounts(name), categories(name)")
        .eq("ledger_id", ledgerId!)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  // Smart note suggestions from past transactions
  const noteSuggestions = useMemo(() => {
    if (!transactions) return [];
    const noteCount = new Map<string, number>();
    transactions.forEach((t: any) => {
      if (t.note && t.note.trim()) {
        const note = t.note.trim();
        noteCount.set(note, (noteCount.get(note) || 0) + 1);
      }
    });
    return Array.from(noteCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([note]) => note);
  }, [transactions]);

  const filteredNoteSuggestions = useMemo(() => {
    if (!txNote) return noteSuggestions;
    return noteSuggestions.filter(n => n.toLowerCase().includes(txNote.toLowerCase()));
  }, [noteSuggestions, txNote]);

  // Success animation handler
  const triggerSuccessAnimation = useCallback(() => {
    // Haptic vibration
    try {
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    } catch (_) { /* vibrate not supported */ }
    // Confetti burst
    setShowSuccessAnimation(true);
    import('canvas-confetti').then((mod) => {
      const confettiFn = mod.default;
      confettiFn({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'],
        zIndex: 9999,
      });
    }).catch(() => { /* confetti not available */ });
    setTimeout(() => setShowSuccessAnimation(false), 1500);
  }, []);

  // Report tab filters
  const reportFilteredTransactions = useMemo(() => {
    return (transactions ?? []).filter((t) => {
      if (filterMonth !== "all" || filterYear !== "all") {
        const [y, m] = t.date.split("-");
        if (filterMonth !== "all" && m !== filterMonth) return false;
        if (filterYear !== "all" && y !== filterYear) return false;
      }
      if (filterCategory !== "all") {
        if ((t.categories as { name: string })?.name !== filterCategory) return false;
      }
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      return true;
    });
  }, [transactions, filterMonth, filterYear, filterCategory, filterDateFrom, filterDateTo]);

  // Quick stat period filter for dashboard
  const periodFilteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStr = todayStr.slice(0, 7);
    const yearStr = todayStr.slice(0, 4);

    let filtered = transactions;
    if (statPeriod === "today") {
      filtered = transactions.filter(t => t.date === todayStr);
    } else if (statPeriod === "month") {
      filtered = transactions.filter(t => t.date.startsWith(monthStr));
    } else if (statPeriod === "year") {
      filtered = transactions.filter(t => t.date.startsWith(yearStr));
    }

    // Apply chart category filter
    if (chartCategory) {
      filtered = filtered.filter(t => (t.categories as { name: string })?.name === chartCategory);
    }

    return filtered;
  }, [transactions, statPeriod, chartCategory]);

  const totalIncome = periodFilteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodFilteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  // Stats for all periods
  const periodStats = useMemo(() => {
    if (!transactions) return { today: { income: 0, expense: 0 }, month: { income: 0, expense: 0 }, year: { income: 0, expense: 0 }, all: { income: 0, expense: 0 } };
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStr = todayStr.slice(0, 7);
    const yearStr = todayStr.slice(0, 4);
    const calc = (txs: typeof transactions) => ({
      income: txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    });
    return {
      today: calc(transactions.filter(t => t.date === todayStr)),
      month: calc(transactions.filter(t => t.date.startsWith(monthStr))),
      year: calc(transactions.filter(t => t.date.startsWith(yearStr))),
      all: calc(transactions),
    };
  }, [transactions]);

  const filteredCategories = categories?.filter((c) => c.type === txType) ?? [];
  const { data: reminders } = useGroceryReminders(ledgerId);

  const addTransaction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        ledger_id: ledgerId!,
        user_id: user!.id,
        account_id: txAccount || null,
        category_id: txCategory || null,
        type: txType,
        amount: parseFloat(txAmount),
        date: txDate,
        time: txTime || null,
        note: txNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Remember last used account
      if (txAccount) {
        localStorage.setItem(`lastAccount_${ledgerId}`, txAccount);
      }
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      setTxDialogOpen(false);
      setTxAmount("");
      setTxCategory("");
      // Keep the same account for next entry (remembered)
      setTxNote("");
      triggerSuccessAnimation();
      toast.success(txType === "income" ? "জমা যোগ হয়েছে!" : "খরচ যোগ হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("categories").insert({
        ledger_id: ledgerId!,
        user_id: user!.id,
        name: newCategoryName.trim(),
        type: txType,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      setTxCategory(data.id);
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("ক্যাটাগরি যোগ হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("categories").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      setEditCategoryId(null);
      setEditCategoryName("");
      toast.success("ক্যাটাগরি আপডেট হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      toast.success("ক্যাটাগরি মুছে ফেলা হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0) {
      toast.error("সঠিক পরিমাণ দিন");
      return;
    }
    addTransaction.mutate();
  };

  const openTxDialog = (type: "income" | "expense") => {
    setTxType(type);
    setTxCategory("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxTime(new Date().toTimeString().slice(0, 5));
    setShowDatePicker(false);
    setTxDialogOpen(true);
  };

  const tabs = [
    { id: "transactions", label: "লেনদেন", icon: CreditCard },
    { id: "grocery", label: "বাজার", icon: ShoppingCart },
    { id: "zakat", label: "যাকাত", icon: Calculator },
    { id: "reports", label: "রিপোর্ট", icon: BarChart3 },
    { id: "categories", label: "ক্যাটাগরি", icon: Tag },
  ];

  // Update sliding indicator position when active tab changes or layout changes
  useEffect(() => {
    const updateIndicator = () => {
      const idx = tabs.findIndex((t) => t.id === activeTab);
      const btn = tabRefs.current[idx];
      const strip = tabStripRef.current;
      if (!btn || !strip) return;
      const stripRect = strip.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - stripRect.left + strip.scrollLeft,
        width: btnRect.width,
      });
    };
    // Run after paint to ensure refs are measured correctly
    const raf = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  const statPeriods: { id: StatPeriod; label: string }[] = [
    { id: "today", label: "আজ" },
    { id: "month", label: "মাস" },
    { id: "year", label: "বছর" },
    { id: "all", label: "সব" },
  ];

  return (
    <div className="min-h-screen page-gradient">
      {/* ─── PREMIUM HEADER ─── */}
      <div className="sticky top-0 z-20 gradient-header px-4 pt-3 pb-3 relative overflow-hidden">
        {/* Accent halos */}
        <div
          className="absolute -top-16 -right-10 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A78BFA, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent 70%)' }}
        />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative max-w-lg mx-auto">
          {/* Top row: back, ledger switcher, theme toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white/80 hover:text-white hover:bg-white/15 rounded-xl h-9 w-9 shrink-0 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Ledger Switcher */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <button
                  onClick={() => setLedgerDropdownOpen(!ledgerDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 backdrop-blur-sm hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-bold text-white truncate max-w-[140px]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                    {ledger?.name ?? "..."}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${ledgerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {ledgerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setLedgerDropdownOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-2xl border bg-popover p-1.5 shadow-xl z-40 animate-scale-in">
                      {allLedgers?.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            setLedgerDropdownOpen(false);
                            if (l.id !== ledgerId) navigate(`/ledger/${l.id}`);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${
                            l.id === ledgerId
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            l.id === ledgerId ? 'gradient-primary' : 'bg-muted'
                          }`}>
                            <Wallet className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="truncate">{l.name}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => { setLedgerDropdownOpen(false); navigate("/"); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-muted-foreground hover:bg-muted transition-colors border-t mt-1 pt-2"
                        style={{ borderColor: 'var(--glass-border)' }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-dashed border-muted-foreground/30">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span>নতুন খাতা</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>


      {/* ─── TOP NAVIGATION TABS ─── */}
      <div className="sticky top-[110px] z-10 px-4 py-2" style={{ background: 'var(--page-gradient)' }}>
        <div className="max-w-lg mx-auto">
          <div
            ref={tabStripRef}
            className="relative flex gap-1 overflow-x-auto no-scrollbar p-1 rounded-2xl border border-white/10"
            style={{
              background: 'var(--gradient-primary)',
              boxShadow: '0 6px 20px -4px hsl(var(--primary) / 0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Animated sliding indicator (white pill behind active tab) */}
            <div
              aria-hidden
              className="absolute top-1 bottom-1 rounded-xl bg-white pointer-events-none"
              style={{
                left: 0,
                width: indicatorStyle.width,
                transform: `translateX(${indicatorStyle.left}px)`,
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1), width 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px -1px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.08)',
                opacity: indicatorStyle.width ? 1 : 0,
              }}
            />
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[idx] = el)}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-[1] flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 py-2 rounded-xl text-xs transition-colors duration-300 ${
                    isActive
                      ? "text-primary font-extrabold"
                      : "text-white font-semibold hover:bg-white/10"
                  }`}
                  style={isActive
                    ? { textShadow: 'none' }
                    : { textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2.75 : 2.25} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-3">
        {reminders && reminders.length > 0 && activeTab === "transactions" && (
          <div className="mb-3">
            <GroceryReminders reminders={reminders} compact />
          </div>
        )}

        {/* ═══ TRANSACTIONS TAB ═══ */}
        {activeTab === "transactions" && (
          <div className="space-y-3 pb-24">
            {/* Donut Hero */}
            <ExpensePieChart
              transactions={periodFilteredTransactions}
              totalBalance={totalBalance}
              onCategorySelect={setChartCategory}
              selectedCategory={chartCategory}
            />

            {/* Quick Stats Bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {statPeriods.map((sp) => {
                const stats = periodStats[sp.id];
                const isActive = statPeriod === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => { setStatPeriod(sp.id); setChartCategory(null); }}
                    className={`stat-pill min-w-[80px] text-center ${isActive ? 'stat-pill-active' : ''}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{sp.label}</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px]" style={{ color: 'var(--income-text-soft)' }}>
                        +{(stats.income / 1000).toFixed(stats.income >= 1000 ? 0 : 1)}k
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--expense-text-soft)' }}>
                        -{(stats.expense / 1000).toFixed(stats.expense >= 1000 ? 0 : 1)}k
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Income / Expense Summary */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="income-zone border rounded-2xl p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--income-bg)' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--income-text-soft)' }} />
                </div>
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--income-text-soft)', opacity: 0.7 }}>জমা</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--income-text)' }}>৳{totalIncome.toLocaleString("bn-BD")}</p>
                </div>
              </div>
              <div className="expense-zone border rounded-2xl p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--expense-bg)' }}>
                  <TrendingDown className="w-4 h-4" style={{ color: 'var(--expense-text-soft)' }} />
                </div>
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--expense-text-soft)', opacity: 0.7 }}>খরচ</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--expense-text)' }}>৳{totalExpense.toLocaleString("bn-BD")}</p>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  সাম্প্রতিক লেনদেন
                  {chartCategory && (
                    <button onClick={() => setChartCategory(null)} className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium">
                      {chartCategory} <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </h3>
              </div>

              {!periodFilteredTransactions.length ? (
                <div className="premium-card p-10 text-center border-dashed">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">কোনো লেনদেন নেই</p>
                  <p className="text-xs text-muted-foreground mt-1">জমা বা খরচ যোগ করুন</p>
                </div>
              ) : (
                <>
                {periodFilteredTransactions.map((tx, index) => {
                  const cardId = tx.id;
                  return (
                  <SwipeableCard
                    key={cardId}
                    onEdit={() => { setEditTx(tx); setEditOpen(true); }}
                    onDelete={async () => {
                      if (confirm("এই লেনদেন মুছে ফেলতে চান?")) {
                        const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
                        if (error) { toast.error("মুছতে ব্যর্থ"); return; }
                        queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
                        toast.success("লেনদেন মুছে ফেলা হয়েছে");
                      }
                    }}
                    className="stagger-item"
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: tx.type === "income" ? 'var(--income-bg)' : 'var(--expense-bg)', color: tx.type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}
                        >
                          {tx.type === "income" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{(tx.categories as { name: string })?.name || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {(tx.accounts as { name: string })?.name || "—"} • {formatBengaliDate(tx.date, (tx as { time?: string }).time)}
                          </p>
                          {tx.note && <p className="text-[11px] text-muted-foreground mt-0.5">{tx.note}</p>}
                        </div>
                      </div>
                      <p className="text-sm font-bold" style={{ color: tx.type === "income" ? 'var(--income-text)' : 'var(--expense-text)' }}>
                        {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                      </p>
                    </div>
                  </SwipeableCard>
                  );
                })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ GROCERY TAB ═══ */}
        {activeTab === "grocery" && (
          <div className="pb-8">
            <GroceryModule ledgerId={ledgerId!} accounts={accounts ?? []} categories={categories ?? []} />
          </div>
        )}

        {/* ═══ ZAKAT TAB ═══ */}
        {activeTab === "zakat" && (
          <div className="pb-8">
            <ZakatCalculator ledgerId={ledgerId!} />
          </div>
        )}

        {/* ═══ REPORTS TAB ═══ */}
        {activeTab === "reports" && (
          <div className="space-y-3 pb-8">
            <MonthlyChart transactions={transactions ?? []} />
            <CategoryBreakdownTable transactions={(transactions as any) ?? []} />

            <div className="premium-card p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                ফিল্টার ও রিপোর্ট
              </h3>
              <TransactionFilters
                month={filterMonth}
                year={filterYear}
                onMonthChange={setFilterMonth}
                onYearChange={setFilterYear}
                onClear={() => { setFilterMonth("all"); setFilterYear("all"); setFilterCategory("all"); setFilterDateFrom(""); setFilterDateTo(""); }}
                categoryFilter={filterCategory}
                onCategoryChange={setFilterCategory}
                categories={categories ?? []}
                dateFrom={filterDateFrom}
                dateTo={filterDateTo}
                onDateFromChange={setFilterDateFrom}
                onDateToChange={setFilterDateTo}
              />
              <div className="flex justify-end pt-1">
                {reportFilteredTransactions.length > 0 && (
                  <AdvancedExport ledgerName={ledger?.name ?? "Report"} transactions={reportFilteredTransactions as any} categories={categories ?? []} />
                )}
              </div>
            </div>

            {/* Filtered transaction list in reports */}
            {reportFilteredTransactions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">{reportFilteredTransactions.length}টি লেনদেন</p>
                {reportFilteredTransactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="premium-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: tx.type === "income" ? 'var(--income-bg)' : 'var(--expense-bg)' }}
                        >
                          {tx.type === "income" ? <TrendingUp className="w-3 h-3" style={{ color: 'var(--income-text-soft)' }} /> : <TrendingDown className="w-3 h-3" style={{ color: 'var(--expense-text-soft)' }} />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{(tx.categories as { name: string })?.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{formatBengaliDate(tx.date)}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold" style={{ color: tx.type === "income" ? 'var(--income-text)' : 'var(--expense-text)' }}>
                        {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CATEGORIES TAB ═══ */}
        {activeTab === "categories" && (
          <div className="space-y-4 pb-8">
            {["income", "expense"].map((type) => (
              <div key={type}>
                <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2" style={{ color: type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }} />
                  {type === "income" ? "জমার ক্যাটাগরি" : "খরচের ক্যাটাগরি"}
                </h3>
                <div className="space-y-1.5">
                  {categories?.filter((c) => c.type === type).map((c) => (
                    <div key={c.id} className="premium-card p-3 flex items-center justify-between gap-2">
                      {editCategoryId === c.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="form-input flex-1 h-9"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            className="h-9 w-9 rounded-xl btn-primary shrink-0"
                            disabled={!editCategoryName.trim() || updateCategory.isPending}
                            onClick={() => updateCategory.mutate({ id: c.id, name: editCategoryName.trim() })}
                          >
                            ✓
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl shrink-0"
                            onClick={() => { setEditCategoryId(null); setEditCategoryName(""); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground flex-1">{c.name}</p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => { setEditCategoryId(c.id); setEditCategoryName(c.name); }}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("এই ক্যাটাগরি মুছে ফেলতে চান?")) deleteCategory.mutate(c.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ADD TRANSACTION BOTTOM SHEET ─── */}
      <BottomSheet open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <BottomSheetContent className="p-0 rounded-t-[28px] overflow-hidden">
          {(() => {
            const isIncome = txType === "income";
            const accentSoft = isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)';
            const accentBg = isIncome ? 'var(--income-bg)' : 'var(--expense-bg)';
            return (
              <>
                {/* Premium Header */}
                <div className="relative px-5 pt-3 pb-4 overflow-hidden">
                  <div
                    className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-40 blur-3xl pointer-events-none"
                    style={{ background: accentBg }}
                  />
                  <div
                    className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
                    style={{ background: 'hsl(var(--primary))' }}
                  />

                  <div className="relative flex justify-center mb-3">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/10"
                      style={{
                        background: accentBg,
                        boxShadow: `0 8px 24px -8px ${accentSoft}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                      }}
                    >
                      {isIncome ? (
                        <TrendingUp className="w-5 h-5" style={{ color: accentSoft }} strokeWidth={2.5} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: accentSoft }} strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-foreground tracking-tight">
                        {isIncome ? "নতুন জমা" : "নতুন ব্যয়"}
                      </h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isIncome ? "জমার তথ্য যোগ করুন" : "খরচের তথ্য যোগ করুন"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTxDialogOpen(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddTx} className="px-4 pb-5 space-y-3.5 max-h-[70vh] overflow-y-auto no-scrollbar">

                  {/* Income/Expense Toggle - segmented */}
                  <div
                    className="flex p-1 rounded-2xl border"
                    style={{
                      background: 'hsl(var(--muted) / 0.5)',
                      borderColor: 'var(--glass-border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setTxType("income"); setTxCategory(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        txType === "income" ? "shadow-sm text-foreground" : "text-muted-foreground"
                      }`}
                      style={txType === "income" ? {
                        background: `linear-gradient(135deg, var(--income-bg), hsl(var(--card)))`,
                        boxShadow: `0 2px 8px -2px var(--income-text-soft)40, inset 0 1px 0 rgba(255,255,255,0.05)`,
                      } : undefined}
                    >
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: txType === "income" ? 'var(--income-text-soft)' : undefined }} strokeWidth={2.5} />
                      জমা
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTxType("expense"); setTxCategory(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        txType === "expense" ? "shadow-sm text-foreground" : "text-muted-foreground"
                      }`}
                      style={txType === "expense" ? {
                        background: `linear-gradient(135deg, var(--expense-bg), hsl(var(--card)))`,
                        boxShadow: `0 2px 8px -2px var(--expense-text-soft)40, inset 0 1px 0 rgba(255,255,255,0.05)`,
                      } : undefined}
                    >
                      <TrendingDown className="w-3.5 h-3.5" style={{ color: txType === "expense" ? 'var(--expense-text-soft)' : undefined }} strokeWidth={2.5} />
                      ব্যয়
                    </button>
                  </div>

                  {/* Premium Amount Card */}
                  <div
                    className="relative rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${accentBg}, hsl(var(--card)) 70%)`,
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <div
                      className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
                      style={{ background: accentSoft }}
                    />
                    <div className="relative flex items-baseline justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.14em]">
                        পরিমাণ
                      </label>
                      <span className="text-[10px] font-semibold text-muted-foreground/60">৳ BDT</span>
                    </div>
                    <div className="relative flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold leading-none" style={{ color: accentSoft }}>৳</span>
                      <CalculatorInput
                        value={txAmount}
                        onChange={setTxAmount}
                        placeholder="০"
                        required
                        className="border-0 bg-transparent text-3xl font-bold h-12 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 tracking-tight"
                      />
                    </div>
                    {txAmount && parseFloat(txAmount) > 0 && (
                      <div className="relative mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                          মোট পরিমাণ
                        </span>
                        <span className="text-xs font-bold" style={{ color: accentSoft }}>
                          ৳{parseFloat(txAmount).toLocaleString("bn-BD")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                      <Tag className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.12em]">ক্যাটাগরি</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-1" />
                    </div>
                    {showNewCategory ? (
                      <div className="flex gap-1.5">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="ক্যাটাগরি নাম"
                          className="form-input flex-1 h-9 text-xs rounded-xl"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-xl btn-primary"
                          disabled={!newCategoryName.trim() || addCategory.isPending}
                          onClick={() => addCategory.mutate()}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 rounded-xl"
                          onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {filteredCategories.map((c) => {
                          const selected = txCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setTxCategory(c.id)}
                              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                                selected
                                  ? "text-foreground shadow-sm scale-[1.02]"
                                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                              }`}
                              style={selected ? {
                                borderColor: accentSoft,
                                background: `linear-gradient(135deg, ${accentBg}, hsl(var(--card)))`,
                                boxShadow: `0 2px 8px -2px ${accentSoft}40`,
                              } : undefined}
                            >
                              {selected && (
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentSoft }} />
                              )}
                              {c.name}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setShowNewCategory(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-200"
                        >
                          <Plus className="w-3 h-3" strokeWidth={2.5} /> নতুন
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Account */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                      <Wallet className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.12em]">অ্যাকাউন্ট</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {accounts?.map((a) => {
                        const selected = txAccount === a.id;
                        const icon = a.type === "bank" ? "🏦" : a.type === "mobile_banking" ? "📱" : "💵";
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setTxAccount(a.id)}
                            className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold transition-all duration-200 border min-h-[58px] ${
                              selected
                                ? "text-foreground shadow-sm"
                                : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                            }`}
                            style={selected ? {
                              borderColor: accentSoft,
                              background: `linear-gradient(160deg, ${accentBg}, hsl(var(--card)))`,
                              boxShadow: `0 2px 10px -3px ${accentSoft}50, inset 0 1px 0 rgba(255,255,255,0.05)`,
                            } : undefined}
                          >
                            <span className="text-base leading-none">{icon}</span>
                            <span className="leading-tight text-center line-clamp-1">{a.name}</span>
                            {selected && (
                              <span
                                className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center"
                                style={{ background: accentSoft }}
                              >
                                <Check className="w-2 h-2 text-white" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.12em]">তারিখ ও সময়</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Date */}
                      <div
                        className="relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-200 hover:border-primary/40"
                        style={{
                          background: 'hsl(var(--card))',
                          borderColor: 'var(--glass-border)',
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                          <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                        </div>
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          required
                          className="bg-transparent border-0 outline-none text-xs font-semibold text-foreground flex-1 w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                      </div>

                      {/* Time */}
                      <div
                        className="relative flex items-center gap-1.5 rounded-xl border px-2.5 py-2.5"
                        style={{
                          background: 'hsl(var(--card))',
                          borderColor: 'var(--glass-border)',
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                          <Clock className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                        </div>
                        {(() => {
                          const [h24Str = "", mStr = ""] = (txTime || "").split(":");
                          const h24 = parseInt(h24Str, 10);
                          const hasTime = !isNaN(h24);
                          const period: "AM" | "PM" = hasTime ? (h24 >= 12 ? "PM" : "AM") : "AM";
                          const h12 = hasTime ? ((h24 % 12) || 12) : NaN;
                          const setFromParts = (h12New: number, mNew: string, periodNew: "AM" | "PM") => {
                            let h = h12New % 12;
                            if (periodNew === "PM") h += 12;
                            const hh = String(h).padStart(2, "0");
                            const mm = (mNew || "00").padStart(2, "0");
                            setTxTime(`${hh}:${mm}`);
                          };
                          return (
                            <>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  placeholder="১২"
                                  value={isNaN(h12) ? "" : h12}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (isNaN(v)) { setTxTime(""); return; }
                                    const clamped = Math.min(12, Math.max(1, v));
                                    setFromParts(clamped, mStr || "00", period);
                                  }}
                                  className="bg-transparent border-0 outline-none text-xs font-bold text-foreground w-6 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-xs font-bold text-muted-foreground/60">:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={59}
                                  placeholder="০০"
                                  value={mStr}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (isNaN(v)) return;
                                    const clamped = Math.min(59, Math.max(0, v));
                                    setFromParts(isNaN(h12) ? 12 : h12, String(clamped).padStart(2, "0"), period);
                                  }}
                                  className="bg-transparent border-0 outline-none text-xs font-bold text-foreground w-6 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="ml-auto flex rounded-lg overflow-hidden border shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
                                <button
                                  type="button"
                                  onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "AM")}
                                  className={`px-1.5 py-1 text-[9px] font-bold transition-all ${
                                    period === "AM" ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  AM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "PM")}
                                  className={`px-1.5 py-1 text-[9px] font-bold transition-all ${
                                    period === "PM" ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  PM
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                      <FileText className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.12em]">নোট</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-1" />
                    </div>
                    <textarea
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                      placeholder="কিসের জন্য? (ঐচ্ছিক)"
                      rows={2}
                      className="w-full rounded-xl border px-3 py-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200 placeholder:text-muted-foreground/40"
                      style={{
                        background: 'hsl(var(--card))',
                        borderColor: 'var(--glass-border)',
                      }}
                      onFocus={() => setShowNoteSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowNoteSuggestions(false), 200)}
                    />
                    {showNoteSuggestions && filteredNoteSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filteredNoteSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setTxNote(suggestion); setShowNoteSuggestions(false); }}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className={`w-full h-12 rounded-2xl text-sm font-bold transition-all duration-300 active:scale-[0.97] ${
                      !txAmount || parseFloat(txAmount) <= 0
                        ? "bg-muted text-muted-foreground shadow-none pointer-events-none"
                        : "btn-primary shadow-lg shadow-primary/20"
                    }`}
                    disabled={addTransaction.isPending || !txAmount || parseFloat(txAmount) <= 0}
                  >
                    {addTransaction.isPending ? (
                      "সংরক্ষণ হচ্ছে..."
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" strokeWidth={3} />
                        {isIncome ? "জমা যোগ করুন" : "ব্যয় যোগ করুন"}
                      </span>
                    )}
                  </Button>
                </form>
              </>
            );
          })()}
        </BottomSheetContent>
      </BottomSheet>


      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        transaction={editTx as any}
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        ledgerId={ledgerId!}
      />

      {/* ─── EXPANDABLE FAB ─── */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("income"); }}
              className="flex items-center gap-2 animate-fade-in"
              style={{ animationDuration: '0.15s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">জমা</span>
              <div className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform" style={{ background: 'var(--income-text-soft)' }}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </button>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("expense"); }}
              className="flex items-center gap-2 animate-fade-in"
              style={{ animationDuration: '0.2s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">খরচ</span>
              <div className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform" style={{ background: 'var(--expense-text-soft)' }}>
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 rounded-full fab-button flex items-center justify-center text-white shadow-xl transition-transform duration-200"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default LedgerDetailPage;
