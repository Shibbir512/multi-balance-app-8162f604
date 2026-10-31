import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, orderBy, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Ledger, Account, Category, Transaction } from "@/integrations/firebase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Pencil, ShoppingCart, Calculator, CreditCard, Tag, Trash2, X, ChevronDown, BarChart3, Calendar, Search, Clock, FileText, Check, Database, Coins, Home, Receipt, Menu } from "lucide-react";
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
import ReportsView from "@/components/ReportsView";
import ExpensePieChart from "@/components/ExpensePieChart";
import SwipeableCard from "@/components/SwipeableCard";
import LedgerWatermarkBackground from "@/components/LedgerWatermarkBackground";
import FinancialSummaryCards from "@/components/FinancialSummaryCards";
import QuickOverview from "@/components/QuickOverview";
import TransactionWorkspace from "@/components/TransactionWorkspace";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileTab from "@/components/ProfileTab";
import SettingsTab from "@/components/SettingsTab";
import HelpTab from "@/components/HelpTab";
import BudgetTab from "@/components/BudgetTab";
import SavingsTab from "@/components/SavingsTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getTxWatermarkIcon = (tx: any) => {
  const catName = (tx.categories as { name: string })?.name || "";
  const note = tx.note?.trim() || "";
  
  if (catName.includes("ব্যবসা")) return Wallet;
  if (catName.includes("খরচ") || tx.type === "expense") return FileText;
  if (catName.includes("জমা") && !note) return Database;
  if (tx.type === "income") return TrendingUp;
  return FileText;
};

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

const getMonthYearLabel = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split("-");
  const monthIndex = parseInt(m, 10) - 1;
  const yearBn = parseInt(y).toLocaleString("bn-BD").replace(/,/g, "");
  return `${BENGALI_MONTHS[monthIndex]} ${yearBn}`;
};

const getLast24Months = () => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    dates.push(`${y}-${m}`);
  }
  return Array.from(new Set(dates));
};
const RECENT_MONTHS = getLast24Months();

type StatPeriod = "today" | "month" | "year" | "all";

const TABS = [
  { id: "transactions", label: "লেনদেন", icon: CreditCard },
  { id: "grocery", label: "বাজার", icon: ShoppingCart },
  { id: "zakat", label: "যাকাত", icon: Calculator },
  { id: "reports", label: "রিপোর্ট", icon: BarChart3 },
  { id: "categories", label: "ক্যাটাগরি", icon: Tag },
];

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
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [ledgerDropdownOpen, setLedgerDropdownOpen] = useState(false);
  const [statPeriod, setStatPeriod] = useState<StatPeriod>("all");
  const [dashboardMonth, setDashboardMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [chartCategory, setChartCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Collapsible Header State & Scroll Logic
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const delta = currentScrollY - lastScrollY.current;

    // When near top (<= 25px), expand header fully
    if (currentScrollY <= 25) {
      setIsHeaderCollapsed(false);
      setIsHeaderHidden(false);
    } else {
      // Past 25px, collapse desktop header to compact mode
      setIsHeaderCollapsed(true);

      // On mobile, hide when scrolling down past 60px, reveal when scrolling up
      if (currentScrollY > 60) {
        if (delta > 6) {
          setIsHeaderHidden(true);
        } else if (delta < -6) {
          setIsHeaderHidden(false);
        }
      } else {
        setIsHeaderHidden(false);
      }
    }

    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    setIsHeaderHidden(false);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const { data: ledger } = useQuery({
    queryKey: ["ledger", ledgerId],
    queryFn: async () => {
      const docSnap = await getDoc(doc(db, "ledgers", ledgerId!));
      if (!docSnap.exists()) throw new Error("Ledger not found");
      const data = { id: docSnap.id, ...docSnap.data() } as Ledger;
      const error = null;
      if (error) throw error;
      return data;
    },
  });

  const { data: allLedgers } = useQuery({
    queryKey: ["ledgers"],
    queryFn: async () => {
      const q = query(collection(db, "ledgers"), where("user_id", "==", user!.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const error = null;
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts", ledgerId],
    queryFn: async () => {
      const q = query(collection(db, "accounts"), where("ledger_id", "==", ledgerId!));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      const error = null;
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
      const q = query(collection(db, "categories"), where("ledger_id", "==", ledgerId!));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      const error = null;
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", ledgerId],
    queryFn: async () => {
      const q = query(collection(db, "transactions"), where("ledger_id", "==", ledgerId!));
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      
      fetchedData.sort((a: any, b: any) => {
        if (a.date !== b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      const accountDocs = await getDocs(query(collection(db, "accounts"), where("ledger_id", "==", ledgerId!)));
      const categoryDocs = await getDocs(query(collection(db, "categories"), where("ledger_id", "==", ledgerId!)));
      const accMap: Record<string, string> = {}; 
      accountDocs.forEach(d => accMap[d.id] = d.data().name);
      const catMap: Record<string, string> = {}; 
      categoryDocs.forEach(d => catMap[d.id] = d.data().name);
      
      const data = fetchedData.map(t => ({
        ...t,
        accounts: { name: accMap[t.account_id] || '' },
        categories: { name: catMap[t.category_id] || '' }
      }));
      const error = null;
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

  const reportTotalIncome = reportFilteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const reportTotalExpense = reportFilteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Quick stat period filter for dashboard
  const periodFilteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yearStr = todayStr.slice(0, 4);

    let filtered = transactions;
    if (statPeriod === "today") {
      filtered = filtered.filter(t => t.date === todayStr);
    } else if (statPeriod === "month") {
      filtered = filtered.filter(t => t.date.startsWith(dashboardMonth));
    } else if (statPeriod === "year") {
      filtered = filtered.filter(t => t.date.startsWith(yearStr));
    }

    // Apply chart category filter
    if (chartCategory) {
      filtered = filtered.filter(t => (t.categories as { name: string })?.name === chartCategory);
    }

    // Apply advanced filters
    if (filterMonth !== "all" || filterYear !== "all") {
      filtered = filtered.filter((t) => {
        const [y, m] = t.date.split("-");
        if (filterMonth !== "all" && m !== filterMonth) return false;
        if (filterYear !== "all" && y !== filterYear) return false;
        return true;
      });
    }
    if (filterCategory !== "all") {
      filtered = filtered.filter(t => (t.categories as { name: string })?.name === filterCategory);
    }
    if (filterDateFrom) {
      filtered = filtered.filter(t => t.date >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter(t => t.date <= filterDateTo);
    }

    return filtered;
  }, [transactions, statPeriod, chartCategory, dashboardMonth, filterMonth, filterYear, filterCategory, filterDateFrom, filterDateTo]);

  const totalIncome = periodFilteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodFilteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  // Stats for all periods
  const periodStats = useMemo(() => {
    if (!transactions) return { today: { income: 0, expense: 0 }, month: { income: 0, expense: 0 }, year: { income: 0, expense: 0 }, all: { income: 0, expense: 0 } };
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yearStr = todayStr.slice(0, 4);
    const calc = (txs: typeof transactions) => ({
      income: txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    });
    return {
      today: calc(transactions.filter(t => t.date === todayStr)),
      month: calc(transactions.filter(t => t.date.startsWith(dashboardMonth))),
      year: calc(transactions.filter(t => t.date.startsWith(yearStr))),
      all: calc(transactions),
    };
  }, [transactions, dashboardMonth]);

  const filteredCategories = useMemo(() => {
    const cats = categories?.filter((c) => c.type === txType) ?? [];
    if (!transactions) return cats;
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === txType && t.category_id) {
        counts[t.category_id] = (counts[t.category_id] || 0) + 1;
      }
    });
    return cats.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  }, [categories, txType, transactions]);
  const { data: reminders } = useGroceryReminders(ledgerId);

  const addTransaction = useMutation({
    mutationFn: async () => {
      const txData = {
        ledger_id: ledgerId!,
        user_id: user!.uid,
        account_id: txAccount || null,
        category_id: txCategory || null,
        type: txType,
        amount: parseFloat(txAmount),
        date: txDate,
        time: txTime || null,
        note: txNote || null,
      };
      txData.created_at = new Date().toISOString();
      await addDoc(collection(db, "transactions"), txData);
      const error = null;
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
      const catData = {
        ledger_id: ledgerId!,
        user_id: user!.uid,
        name: newCategoryName.trim(),
        type: txType,
      };
      catData.created_at = new Date().toISOString();
      const docRef = await addDoc(collection(db, "categories"), catData);
      const data = { id: docRef.id, ...catData };
      const error = null;
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
      await updateDoc(doc(db, "categories", id), { name });
      const error = null;
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
      await deleteDoc(doc(db, "categories", id));
      const error = null;
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
    const defaultAcc = accounts?.find(a => a.name.includes("নগদ") || a.name.toLowerCase().includes("nagad")) || accounts?.[0];
    setTxAccount(defaultAcc?.id || "");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxTime(new Date().toTimeString().slice(0, 5));
    setShowDatePicker(false);
    setIsCategoryExpanded(false);
    setIsAccountExpanded(false);
    setTxDialogOpen(true);
  };

  // Update sliding indicator position when active tab changes or layout changes
  useEffect(() => {
    const updateIndicator = () => {
      const idx = TABS.findIndex((t) => t.id === activeTab);
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
    <div className="min-h-screen flex bg-[#F6F7FC] dark:bg-[#080B14] relative z-0">
      {/* Vivid Glassy Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[#F8F9FE] dark:bg-[#080B14]">
        {/* Top Right Orb */}
        <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#7C3AED]/25 to-[#4338CA]/25 blur-[80px] dark:from-[#7C3AED]/15 dark:to-[#4338CA]/15" />
        {/* Bottom Left Orb */}
        <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#3B82F6]/15 to-[#06B6D4]/15 blur-[80px] dark:from-[#3B82F6]/10 dark:to-[#06B6D4]/10" />
        {/* Center Accent Orb */}
        <div className="absolute top-[25%] left-[30%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#EC4899]/10 to-[#8B5CF6]/10 blur-[80px] dark:from-[#EC4899]/5 dark:to-[#8B5CF6]/5" />
        {/* Very subtle transparent overlay to blend, no muddy white */}
        <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[30px] -z-10" />
      </div>

      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTxDialog={openTxDialog}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ledgerName={ledger?.name}
        allLedgers={allLedgers}
        currentLedgerId={ledgerId}
        user={user}
        onExport={() => setExportDialogOpen(true)}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
          isCollapsed={isHeaderCollapsed}
          isHidden={isHeaderHidden}
          onToggleCollapse={() => setIsHeaderCollapsed(prev => !prev)}
          ledgerName={ledger?.name}
        />
        <main
          ref={mainScrollRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
      <div className="w-full px-3.5 sm:px-4 lg:px-6 xl:px-8 pt-3 pb-24 md:py-6">
        {/* Prominent Active Ledger Banner at the top of the page */}
        {ledger?.name && (
          <div className="mb-3.5 flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                <Wallet className="w-5 h-5 text-slate-950" strokeWidth={2.3} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    চলতি লেজার
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate tracking-tight">
                  {ledger.name}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 sm:px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-700/60 shrink-0 cursor-pointer"
              title="সকল খাতার তালিকায় ফিরে যান"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">সব খাতা</span>
            </button>
          </div>
        )}

        {reminders && reminders.length > 0 && activeTab === "transactions" && (
          <div className="mb-3">
            <GroceryReminders reminders={reminders} compact />
          </div>
        )}

        {/* ═══ TRANSACTIONS TAB ═══ */}
        {activeTab === "transactions" && (
          <div key="tab-transactions" className="pb-24 animate-fade-in-up">
            <div className="hidden md:block">
              <FinancialSummaryCards
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                totalBalance={totalBalance}
                monthlyBudget={(ledger as any)?.monthlyBudget || 0}
              />
            </div>
            <div className="lg:grid lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)] gap-[20px] items-start">
              {/* Left Column: Summary & Chart */}
              <div className="flex flex-col gap-[20px]">
                {/* Donut Hero */}
                <ExpensePieChart
                  transactions={periodFilteredTransactions}
                  totalBalance={totalBalance}
                  onCategorySelect={setChartCategory}
                  selectedCategory={chartCategory}
                  periodLabel={statPeriod === 'month' ? getMonthYearLabel(dashboardMonth).split(' ')[0] : statPeriods.find(s => s.id === statPeriod)?.label}
                  periodSelector={
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                      {statPeriods.map((sp) => {
                                        const stats = periodStats[sp.id];
                                        const isActive = statPeriod === sp.id;
                                        
                                        if (sp.id === "month") {
                                          return (
                                            <Select key={sp.id} value={dashboardMonth} onValueChange={(v) => { setDashboardMonth(v); setStatPeriod("month"); setChartCategory(null); }}>
                                              <SelectPrimitive.Trigger asChild>
                                                <button
                                                  onClick={() => { setStatPeriod("month"); setChartCategory(null); }}
                                                  className={`stat-pill w-full min-w-0 !px-1 sm:!px-2.5 py-1.5 sm:py-2 text-center outline-none ${isActive ? 'stat-pill-active' : ''}`}
                                                >
                                                  <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 h-[14px] flex items-center justify-center truncate">
                                                    {isActive ? getMonthYearLabel(dashboardMonth).split(' ')[0] : sp.label}
                                                  </p>
                                                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                                    <span className="text-[9px] sm:text-[10px] whitespace-nowrap" style={{ color: 'var(--income-text-soft)' }}>
                                                      +{(stats.income / 1000).toFixed(stats.income >= 1000 ? 0 : 1)}k
                                                    </span>
                                                    <span className="text-[9px] sm:text-[10px] whitespace-nowrap" style={{ color: 'var(--expense-text-soft)' }}>
                                                      -{(stats.expense / 1000).toFixed(stats.expense >= 1000 ? 0 : 1)}k
                                                    </span>
                                                  </div>
                                                </button>
                                              </SelectPrimitive.Trigger>
                                              <SelectContent className="max-h-[300px]">
                                                {RECENT_MONTHS.map(ym => (
                                                  <SelectItem key={ym} value={ym} className="text-xs font-semibold">{getMonthYearLabel(ym)}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          );
                                        }
                    
                                        return (
                                          <button
                                            key={sp.id}
                                            onClick={() => { setStatPeriod(sp.id); setChartCategory(null); }}
                                            className={`stat-pill w-full min-w-0 !px-1 sm:!px-2.5 py-1.5 sm:py-2 text-center ${isActive ? 'stat-pill-active' : ''}`}
                                          >
                                            <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 h-[14px] flex items-center justify-center truncate">{sp.label}</p>
                                            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                              <span className="text-[9px] sm:text-[10px] whitespace-nowrap" style={{ color: 'var(--income-text-soft)' }}>
                                                +{(stats.income / 1000).toFixed(stats.income >= 1000 ? 0 : 1)}k
                                              </span>
                                              <span className="text-[9px] sm:text-[10px] whitespace-nowrap" style={{ color: 'var(--expense-text-soft)' }}>
                                                -{(stats.expense / 1000).toFixed(stats.expense >= 1000 ? 0 : 1)}k
                                              </span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                    
                  }
                />
                <QuickOverview
                  transactions={transactions?.filter(t => t.date.startsWith(dashboardMonth)) || []}
                  totalIncome={periodStats.month.income}
                  totalExpense={periodStats.month.expense}
                />
              </div>

              {/* Right Column: Transaction List */}
              <div className="mt-6 lg:mt-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <TransactionWorkspace
                  transactions={periodFilteredTransactions as any[]}
                  onEdit={(tx) => { setEditTx(tx as any); setEditOpen(true); }}
                  onDelete={(id) => setDeleteTxId(id)}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onExport={() => setExportDialogOpen(true)}
                  monthSelector={
                    <Select value={dashboardMonth} onValueChange={(v: string) => { setDashboardMonth(v); setStatPeriod("month"); setChartCategory(null); }}>
                      <SelectPrimitive.Trigger asChild>
                        <button
                          className="flex items-center gap-[6px] h-[38px] lg:h-[40px] rounded-xl px-[12px] lg:px-[14px] transition-all duration-150 shrink-0 border border-[#E8EAF2] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1E293B] hover:bg-[#F9FAFB] dark:hover:bg-[#263449] active:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
                        >
                          <Calendar
                            className="w-[15px] h-[15px] shrink-0 text-[#64748B] dark:text-[#94A3B8]"
                            strokeWidth={2}
                          />
                          <span
                            className="text-[#334155] dark:text-[#E2E8F0] whitespace-nowrap font-medium text-[13px]"
                          >
                            {getMonthYearLabel(dashboardMonth)}
                          </span>
                          <ChevronDown
                            className="w-[14px] h-[14px] shrink-0 text-[#94A3B8] dark:text-[#64748B] ml-1"
                            strokeWidth={2}
                          />
                        </button>
                      </SelectPrimitive.Trigger>
                      <SelectContent className="max-h-[300px]">
                        {RECENT_MONTHS.map((ym) => (
                          <SelectItem key={ym} value={ym} className="text-xs font-medium">
                            {getMonthYearLabel(ym)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                  filterButton={
                    <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl">
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
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ GROCERY TAB ═══ */}
        {activeTab === "grocery" && (
          <div key="tab-grocery" className="pb-8 animate-fade-in-up">
            <GroceryModule ledgerId={ledgerId!} accounts={accounts ?? []} categories={categories ?? []} />
          </div>
        )}

        {/* ═══ ZAKAT TAB ═══ */}
        {activeTab === "zakat" && (
          <div key="tab-zakat" className="pb-8 animate-fade-in-up">
            <ZakatCalculator ledgerId={ledgerId!} />
          </div>
        )}

        {/* ═══ REPORTS TAB ═══ */}
        {activeTab === "reports" && (
          <div key="tab-reports" className="pb-8 animate-fade-in-up">
            <ReportsView
              ledgerName={ledger?.name ?? "রিপোর্ট"}
              transactions={(transactions as any) ?? []}
              categories={categories ?? []}
              accounts={accounts ?? []}
              onEditTx={(tx) => {
                setEditTx(tx as any);
                setEditOpen(true);
              }}
              onDeleteTx={(id) => setDeleteTxId(id)}
            />
          </div>
        )}

        {/* ═══ CATEGORIES TAB ═══ */}
        {activeTab === "categories" && (
          <div key="tab-categories" className="space-y-4 pb-8 animate-fade-in-up">
            {["income", "expense"].map((type) => (
              <div key={type}>
                <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2" style={{ color: type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }} />
                  {type === "income" ? "জমার ক্যাটাগরি" : "খরচের ক্যাটাগরি"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories?.filter((c) => c.type === type).map((c) => (
                    <div key={c.id} className="premium-card p-3 flex items-center justify-between gap-2 h-full">
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
                              onClick={() => setDeleteCategoryId(c.id)}
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
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "settings" && (
          <SettingsTab
            ledgerName={ledger?.name}
            transactions={transactions ?? []}
            categories={categories ?? []}
            onExport={() => setExportDialogOpen(true)}
          />
        )}
        {activeTab === "help" && <HelpTab />}
        {activeTab === "budget" && <BudgetTab />}
        {activeTab === "savings" && <SavingsTab />}
      </div>
        </main>

      {/* ─── ADD TRANSACTION MODAL ─── */}
      <TransactionEditDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        ledgerId={ledgerId!}
        defaultType={txType}
        noteSuggestions={noteSuggestions}
        onSuccess={triggerSuccessAnimation}
      />


      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        transaction={editTx as any}
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        ledgerId={ledgerId!}
      />

      {/* ─── ADVANCED EXPORT & BACKUP MODAL (CSV & PDF) ─── */}
      <AdvancedExport
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        ledgerName={ledger?.name || "খাতা"}
        transactions={transactions ?? []}
        categories={categories ?? []}
      />

      {/* ─── EXPANDABLE FAB (Desktop) ─── */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200 hidden md:block"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-end gap-3">
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("income"); }}
              className="flex items-center gap-2 animate-fade-in cursor-pointer"
              style={{ animationDuration: '0.15s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">জমা</span>
              <div className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform" style={{ background: 'var(--income-text-soft)' }}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </button>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("expense"); }}
              className="flex items-center gap-2 animate-fade-in cursor-pointer group"
              style={{ animationDuration: '0.2s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-border/50">খরচ</span>
              <div className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform bg-rose-600 hover:bg-rose-700">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 rounded-full fab-button flex items-center justify-center text-white shadow-xl transition-transform duration-200 cursor-pointer"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ─── MOBILE BOTTOM NAVIGATION BAR (Thumb Zone) ─── */}
      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E1526]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex items-center justify-around px-2 h-16 pb-[env(safe-area-inset-bottom,0px)]">
        {/* 1. খাতা তালিকা */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-slate-500 dark:text-slate-400 hover:text-foreground active:scale-95 transition-all cursor-pointer"
        >
          <Home className="w-[20px] h-[20px] stroke-[1.8]" />
          <span className="text-[10px] font-semibold">খাতা</span>
        </button>

        {/* 2. লেনদেন ট্যাব */}
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === "transactions"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-foreground"
          }`}
        >
          <Receipt className="w-[20px] h-[20px] stroke-[1.8]" />
          <span className="text-[10px] font-semibold">লেনদেন</span>
        </button>

        {/* 3. সেন্ট্রাল কুইক এন্ট্রি বাটন (+ নতুন লেনদেন) */}
        <button
          type="button"
          onClick={() => openTxDialog("expense")}
          className="flex flex-col items-center justify-center -mt-6 cursor-pointer group active:scale-90 transition-transform"
          aria-label="নতুন লেনদেন"
        >
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 border-2 border-white dark:border-[#0E1526]">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-foreground mt-0.5">নতুন</span>
        </button>

        {/* 4. রিপোর্ট ট্যাব */}
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === "reports"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-[20px] h-[20px] stroke-[1.8]" />
          <span className="text-[10px] font-semibold">রিপোর্ট</span>
        </button>

        {/* 5. মেনু ও অন্যান্য অপশন */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-slate-500 dark:text-slate-400 hover:text-foreground active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="w-[20px] h-[20px] stroke-[1.8]" />
          <span className="text-[10px] font-semibold">মেনু</span>
        </button>
      </nav>

      {/* ─── DELETE TRANSACTION CONFIRM ─── */}
      <AlertDialog open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[85%]">
          <AlertDialogHeader>
            <AlertDialogTitle>লেনদেন মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই লেনদেনটি স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTxId) return;
                const id = deleteTxId;
                setDeleteTxId(null);
                await deleteDoc(doc(db, "transactions", id));
      const error = null;
                if (error) { toast.error("মুছতে ব্যর্থ"); return; }
                queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
                toast.success("লেনদেন মুছে ফেলা হয়েছে");
              }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DELETE CATEGORY CONFIRM ─── */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={(o) => !o && setDeleteCategoryId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[85%]">
          <AlertDialogHeader>
            <AlertDialogTitle>ক্যাটাগরি মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই ক্যাটাগরিটি স্থায়ীভাবে মুছে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteCategoryId) return;
                deleteCategory.mutate(deleteCategoryId);
                setDeleteCategoryId(null);
              }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};

export default LedgerDetailPage;
