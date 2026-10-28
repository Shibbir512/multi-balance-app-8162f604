import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Search, Plus, X, Wallet, Receipt, Zap, Trash2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import CalculatorInput from "./CalculatorInput";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  account_id: string | null;
  category_id: string | null;
  ledger_id: string;
  time?: string | null;
}

interface Props {
  transaction?: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string; type?: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  ledgerId: string;
  defaultType?: "income" | "expense";
  noteSuggestions?: string[];
  onSuccess?: () => void;
}

const normalizeDateStr = (rawDate: any): string => {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  if (typeof rawDate === "string") {
    const clean = rawDate.split("T")[0].split(" ")[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  return new Date().toISOString().split("T")[0];
};

const normalizeTimeStr = (rawTime: any): string => {
  if (!rawTime) return new Date().toTimeString().slice(0, 5);
  if (typeof rawTime === "string") {
    const match = rawTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = match[1].padStart(2, "0");
      const m = match[2];
      return `${h}:${m}`;
    }
  }
  return new Date().toTimeString().slice(0, 5);
};

const formatBnDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const months = [
    "জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"
  ];
  const bnDigits = "০১২৩৪৫৬৭৮৯";
  const toBn = (n: number | string) =>
    String(n).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let prefix = "";
  if (clean === todayStr) prefix = "আজ, ";
  else if (clean === yesterdayStr) prefix = "গতকাল, ";

  const dayBn = toBn(d);
  const monthBn = months[m - 1] || "";
  const yearBn = toBn(y);
  return `${prefix}${dayBn} ${monthBn}, ${yearBn}`;
};

const formatBnTime = (timeStr: string): string => {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const bnDigits = "০১২৩৪৫৬৭৮৯";
  const toBn = (n: number | string) =>
    String(n).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);
  return `${toBn(h)}:${toBn(m)} ${period}`;
};

const TransactionEditDialog = ({
  transaction,
  open,
  onOpenChange,
  accounts,
  categories,
  ledgerId,
  defaultType = "expense",
  noteSuggestions = [],
  onSuccess,
}: Props) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!(transaction && transaction.id);

  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (transaction) {
        setTxType(transaction.type as "income" | "expense");
        setAmount(transaction.amount ? transaction.amount.toString() : "");
        setCategoryId(transaction.category_id || "");
        setAccountId(transaction.account_id || "");
        setDate(normalizeDateStr(transaction.date));
        setTime(normalizeTimeStr(transaction.time));
        setNote(transaction.note || "");
      } else {
        setTxType(defaultType || "expense");
        setAmount("");
        setCategoryId("");
        const lastAccId = localStorage.getItem(`lastAccount_${ledgerId}`);
        const defaultAcc =
          (lastAccId && accounts.find((a) => a.id === lastAccId)) ||
          accounts.find((a) => a.name.includes("নগদ") || a.name.toLowerCase().includes("nagad")) ||
          accounts[0];
        setAccountId(defaultAcc?.id || "");
        setDate(normalizeDateStr(null));
        setTime(normalizeTimeStr(null));
        setNote("");
      }
      setShowCategorySearch(false);
      setNewCategoryName("");
      setDatePopoverOpen(false);
      setTimePopoverOpen(false);
    }
  }, [open, transaction, defaultType, ledgerId, accounts]);

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDate(`${y}-${m}-${day}`);
    setDatePopoverOpen(false);
    toast.success(offsetDays === 0 ? "আজকের তারিখ সেট করা হয়েছে" : offsetDays === 1 ? "গতকালের তারিখ সেট করা হয়েছে" : "তারিখ সেট করা হয়েছে");
  };

  const setQuickTime = (timeStr: string) => {
    setTime(timeStr);
    setTimePopoverOpen(false);
    toast.success("সময় সেট করা হয়েছে");
  };

  const filteredCategories = categories.filter((c) => c.type === txType);
  const isIncome = txType === "income";

  const parsedAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const triggerSuccessAnimation = () => {
    try {
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    } catch (_) {}
    import("canvas-confetti").then((mod) => {
      mod.default({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"],
        zIndex: 9999,
      });
    });
  };

  const addCategory = useMutation({
    mutationFn: async () => {
      const catData = {
        ledger_id: ledgerId,
        user_id: user!.uid,
        name: newCategoryName.trim(),
        type: txType,
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "categories"), catData);
      return { id: docRef.id, ...catData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      setCategoryId(data.id);
      setNewCategoryName("");
      setShowCategorySearch(false);
      toast.success("ক্যাটাগরি যোগ হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!hasValidAmount) {
        throw new Error("সঠিক পরিমাণ দিন");
      }

      if (isEdit) {
        await updateDoc(doc(db, "transactions", transaction!.id), {
          type: txType,
          amount: parsedAmount,
          category_id: categoryId || null,
          account_id: accountId || null,
          date,
          time: time || null,
          note: note || null,
        });
      } else {
        const txData = {
          ledger_id: ledgerId,
          user_id: user!.uid,
          account_id: accountId || null,
          category_id: categoryId || null,
          type: txType,
          amount: parsedAmount,
          date,
          time: time || null,
          note: note || null,
          created_at: new Date().toISOString(),
        };
        await addDoc(collection(db, "transactions"), txData);
        if (accountId) {
          localStorage.setItem(`lastAccount_${ledgerId}`, accountId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      if (isEdit) {
        toast.success("লেনদেন আপডেট হয়েছে!");
      } else {
        triggerSuccessAnimation();
        if (onSuccess) onSuccess();
        toast.success(isIncome ? "জমা যোগ হয়েছে!" : "খরচ যোগ হয়েছে!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!transaction?.id) return;
      await deleteDoc(doc(db, "transactions", transaction.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      setDeleteOpen(false);
      onOpenChange(false);
      toast.success("লেনদেন মুছে ফেলা হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent
          className="p-0 border-0 md:border md:rounded-[24px] 
          inset-0 md:inset-auto md:top-[50%] md:left-[50%] md:-translate-x-1/2 md:-translate-y-1/2 
          w-full md:w-[540px] md:max-w-[calc(100vw-32px)] 
          h-full md:h-auto md:max-h-[calc(100vh-48px)] 
          bg-background flex flex-col shadow-2xl rounded-none md:rounded-[24px]"
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0 bg-background">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 transition-colors"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h2 className="text-[18px] font-bold text-foreground">
              {isEdit ? "লেনদেন এডিট" : "নতুন"}
            </h2>

            <div className="flex items-center gap-1">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>("input[inputmode='decimal']");
                  if (input) input.focus();
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="পরিমাণ লিখুন"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate(new Date().toISOString().split("T")[0]);
                  setTime(new Date().toTimeString().slice(0, 5));
                  toast.success("বর্তমান সময় সেট করা হয়েছে");
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="বর্তমান সময়"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (hasValidAmount) {
                submitMutation.mutate();
              } else {
                toast.error("সঠিক পরিমাণ দিন");
              }
            }}
            className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3.5 sm:space-y-4"
          >
            {/* Row 1: Date & Time Selectors */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Date Popover */}
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative h-11 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between px-3 cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-colors group w-full text-left"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-[12.5px] sm:text-[13.5px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {formatBnDate(date)}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-blue-500/70 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    className="w-auto p-3 z-[150] shadow-2xl rounded-2xl bg-popover border border-border"
                  >
                    <div className="space-y-2.5">
                      {/* Quick date chips */}
                      <div className="flex items-center gap-1.5 pb-2 border-b border-border/50">
                        <button
                          type="button"
                          onClick={() => setQuickDate(0)}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          আজ
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDate(1)}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          গতকাল
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDate(2)}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          গত পরশু
                        </button>
                      </div>

                      {/* Visual Interactive Calendar */}
                      <Calendar
                        mode="single"
                        selected={date ? new Date(date + "T00:00:00") : new Date()}
                        onSelect={(newDate) => {
                          if (newDate) {
                            const y = newDate.getFullYear();
                            const m = String(newDate.getMonth() + 1).padStart(2, "0");
                            const d = String(newDate.getDate()).padStart(2, "0");
                            setDate(`${y}-${m}-${d}`);
                            setDatePopoverOpen(false);
                          }
                        }}
                        className="rounded-xl border border-border/40 p-2 mx-auto"
                      />

                      {/* Direct Date Input Fallback */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium">ক্যালেন্ডার ইনপুট:</span>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            if (e.target.value) {
                              setDate(e.target.value);
                              setDatePopoverOpen(false);
                            }
                          }}
                          className="h-8 text-xs px-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Time Popover */}
                <Popover open={timePopoverOpen} onOpenChange={setTimePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative h-11 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between px-3 cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-colors group w-full text-left"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-[12.5px] sm:text-[13.5px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {formatBnTime(time)}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-blue-500/70 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    className="w-72 p-3.5 z-[150] shadow-2xl rounded-2xl bg-popover border border-border"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">লেনদেনের সময়</span>
                        <button
                          type="button"
                          onClick={() => setQuickTime(new Date().toTimeString().slice(0, 5))}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          এখনকার সময়
                        </button>
                      </div>

                      {/* Direct Time Input */}
                      <div className="flex justify-center">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full h-11 text-center text-lg font-bold rounded-xl border border-border bg-background tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Quick Time Presets */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setQuickTime("09:00")}
                          className="px-2 py-1.5 text-xs rounded-lg border bg-muted/30 hover:bg-muted font-medium text-center"
                        >
                          সকাল ০৯:০০
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickTime("13:00")}
                          className="px-2 py-1.5 text-xs rounded-lg border bg-muted/30 hover:bg-muted font-medium text-center"
                        >
                          দুপুর ০১:০০
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickTime("17:30")}
                          className="px-2 py-1.5 text-xs rounded-lg border bg-muted/30 hover:bg-muted font-medium text-center"
                        >
                          বিকাল ০৫:৩০
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickTime("21:00")}
                          className="px-2 py-1.5 text-xs rounded-lg border bg-muted/30 hover:bg-muted font-medium text-center"
                        >
                          রাত ০৯:০০
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTimePopoverOpen(false)}
                        className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        ঠিক আছে
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quick shortcut chips directly on the form */}
              <div className="flex items-center gap-1.5 px-0.5 overflow-x-auto no-scrollbar text-xs">
                <span className="text-[11px] text-muted-foreground mr-0.5 shrink-0">দ্রুত বাছুন:</span>
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors shrink-0 ${
                    date === new Date().toISOString().split("T")[0]
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  আজ
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors shrink-0 ${
                    (() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      return date === y.toISOString().split("T")[0];
                    })()
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  গতকাল
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTime(new Date().toTimeString().slice(0, 5));
                    toast.success("বর্তমান সময় সেট করা হয়েছে");
                  }}
                  className="px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> এখন
                </button>
              </div>
            </div>

            {/* Row 2: Type Toggle (আয় / ব্যয়) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setCategoryId("");
                }}
                className={`h-12 rounded-2xl text-[16px] font-bold transition-all duration-200 flex items-center justify-center ${
                  isIncome
                    ? "bg-[#10B981] text-white shadow-sm"
                    : "bg-muted/50 dark:bg-muted/30 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                আয়
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setCategoryId("");
                }}
                className={`h-12 rounded-2xl text-[16px] font-bold transition-all duration-200 flex items-center justify-center ${
                  !isIncome
                    ? "bg-[#EF4444] text-white shadow-sm"
                    : "bg-muted/50 dark:bg-muted/30 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                ব্যয়
              </button>
            </div>

            {/* Row 3: Category Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {/* Search / Add Button */}
                <button
                  type="button"
                  onClick={() => setShowCategorySearch(!showCategorySearch)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    showCategorySearch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title="ক্যাটাগরি খুঁজুন বা যোগ করুন"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Category Pills */}
                {filteredCategories.map((c) => {
                  const selected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(selected ? "" : c.id)}
                      className={`h-9 px-4 rounded-full border text-[13px] font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                        selected
                          ? isIncome
                            ? "bg-[#10B981] border-[#10B981] text-white font-semibold shadow-xs"
                            : "bg-[#EF4444] border-[#EF4444] text-white font-semibold shadow-xs"
                          : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inline Add / Search Category if toggled */}
              {showCategorySearch && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 border border-border/50 rounded-2xl animate-in fade-in-50">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="নতুন ক্যাটাগরি নাম..."
                    className="flex-1 h-9 px-3 text-[13px] bg-background border border-border/70 rounded-xl outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!newCategoryName.trim() || addCategory.isPending}
                    onClick={() => addCategory.mutate()}
                    className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> যোগ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategorySearch(false);
                      setNewCategoryName("");
                    }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Row 4: Account Selector */}
            {accounts && accounts.length > 0 && (
              <div className="flex items-center gap-2 px-0.5">
                <div className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  <span>অ্যাকাউন্ট:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {accounts.map((a) => {
                    const selected = accountId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAccountId(a.id)}
                        className={`h-7 px-3 rounded-full text-[12px] font-medium shrink-0 border transition-all ${
                          selected
                            ? "bg-primary/10 border-primary text-primary font-semibold shadow-2xs"
                            : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 5: Amount Input */}
            <div className="space-y-1">
              <div className="h-[54px] sm:h-[58px] rounded-2xl border-2 border-border/70 bg-card flex items-center px-4 gap-3 focus-within:border-primary/60 transition-all shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-muted/60 dark:bg-muted/40 flex items-center justify-center shrink-0">
                  <span className="text-[17px] font-bold text-foreground leading-none">৳</span>
                </div>
                <CalculatorInput
                  value={amount}
                  onChange={setAmount}
                  required
                  placeholder="টাকার পরিমাণ"
                  className="text-[19px] sm:text-[21px] font-bold text-foreground placeholder:text-muted-foreground/40 leading-none"
                />
              </div>
            </div>

            {/* Row 6: Description / Note Input */}
            <div className="space-y-1.5">
              <div className="h-[54px] sm:h-[58px] rounded-2xl border-2 border-border/70 bg-card flex items-center px-4 gap-3 focus-within:border-primary/60 transition-all shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-muted/60 dark:bg-muted/40 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest" })}
                  placeholder="বিবরণ (অপশনাল)"
                  className="flex-1 bg-transparent border-none text-[14.5px] sm:text-[15px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:ring-0 p-0 outline-none"
                />
              </div>
              {noteSuggestions && noteSuggestions.length > 0 && !note && (
                <div className="flex flex-wrap gap-1.5 pt-0.5 px-0.5">
                  {noteSuggestions.slice(0, 4).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setNote(sugg)}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 7: Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={!hasValidAmount || submitMutation.isPending}
                className={`w-full h-[50px] sm:h-[52px] rounded-2xl text-[16px] font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  !hasValidAmount
                    ? "bg-[#E5E7EB] dark:bg-muted/50 text-[#9CA3AF] dark:text-muted-foreground/50 cursor-not-allowed"
                    : isIncome
                    ? "bg-[#10B981] hover:bg-[#059669] text-white shadow-md active:scale-[0.99]"
                    : "bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md active:scale-[0.99]"
                }`}
              >
                {submitMutation.isPending
                  ? "যোগ হচ্ছে..."
                  : isEdit
                  ? "আপডেট"
                  : "অ্যাড"}
              </button>
            </div>
          </form>
        </BottomSheetContent>
      </BottomSheet>

      {/* Delete Confirmation Alert */}
      {isEdit && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="rounded-2xl bg-popover border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>লেনদেন মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>এই লেনদেন স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                {deleteMutation.isPending ? "মুছছে..." : "মুছে ফেলুন"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default TransactionEditDialog;
