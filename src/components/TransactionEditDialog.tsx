import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Search, Plus, X, Wallet, Receipt, Zap, Trash2, ChevronDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const initializedTxRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (open) {
      // Only initialize form when dialog first opens or when editing a different transaction
      const currentTxId = transaction?.id || null;
      if (initializedTxRef.current === currentTxId) return;
      initializedTxRef.current = currentTxId;

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
      setShowAccountPicker(false);
    } else {
      // Reset the ref when dialog closes so it re-initializes next time
      initializedTxRef.current = undefined;
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
          className="p-0 border-t md:border rounded-t-[28px] md:rounded-[24px] 
          w-full md:w-[540px] md:max-w-[calc(100vw-32px)] 
          max-h-[92dvh] md:max-h-[calc(100vh-48px)] 
          bg-background flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Top Subtle Status Line */}
          <div className={`h-[2.5px] w-full transition-colors duration-200 shrink-0 ${
            !isIncome ? "bg-rose-500 dark:bg-rose-500" : "bg-emerald-500 dark:bg-emerald-500"
          }`} />

          {/* Mobile Handle Indicator */}
          <div className="pt-2 pb-1 md:hidden flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* 1. Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 bg-background">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {isEdit ? "লেনদেন সম্পাদনা" : "নতুন এন্ট্রি"}
              </h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
                !isIncome
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
              }`}>
                {!isIncome ? "খরচ" : "জমা"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="বর্তমান সময়"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Form with Scrollable Inputs and Pinned Submit Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (hasValidAmount) {
                submitMutation.mutate();
              } else {
                toast.error("সঠিক পরিমাণ দিন");
              }
            }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            {/* Scrollable Form Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3.5 overscroll-contain">
              {/* Row 1: Date & Time Selectors */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Date Popover */}
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-10 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/80 flex items-center justify-between px-3 cursor-pointer transition-colors group w-full text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground" />
                        <span className="text-[13px] font-medium text-foreground truncate">
                          {formatBnDate(date)}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
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
                      className="h-10 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/80 flex items-center justify-between px-3 cursor-pointer transition-colors group w-full text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground" />
                        <span className="text-[13px] font-medium text-foreground truncate">
                          {formatBnTime(time)}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    className="w-72 p-3.5 z-[150] shadow-xl rounded-2xl bg-popover border border-border"
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
                          className="w-full h-10 text-center text-base font-semibold rounded-xl border border-border bg-background tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
                        />
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
            </div>

            {/* Row 2: Type Segmented Toggle */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/60 gap-1">
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setCategoryId("");
                }}
                className={`h-10 rounded-lg text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isIncome
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>আয় (জমা)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setCategoryId("");
                }}
                className={`h-10 rounded-lg text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isIncome
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>ব্যয় (খরচ)</span>
              </button>
            </div>

            {/* Row 3: Category Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {/* Search / Add Button */}
                <button
                  type="button"
                  onClick={() => setShowCategorySearch(!showCategorySearch)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                    showCategorySearch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title="ক্যাটাগরি খুঁজুন বা যোগ করুন"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                {/* Category Pills */}
                {filteredCategories.map((c) => {
                  const selected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(selected ? "" : c.id)}
                      className={`h-8 px-3 rounded-lg border text-[12.5px] font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                        selected
                          ? isIncome
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold"
                            : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold"
                          : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inline Add / Search Category if toggled */}
              {showCategorySearch && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 border border-border/60 rounded-xl animate-in fade-in-50">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="নতুন ক্যাটাগরি নাম..."
                    className="flex-1 h-9 px-3 text-[13px] bg-background border border-border/70 rounded-lg outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!newCategoryName.trim() || addCategory.isPending}
                    onClick={() => addCategory.mutate()}
                    className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> যোগ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategorySearch(false);
                      setNewCategoryName("");
                    }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Row 4: Amount Input */}
            <div className="space-y-1.5">
              <div className="h-14 rounded-xl border border-border/80 bg-background flex items-center px-4 gap-3 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5 transition-all shadow-xs">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-[15px] font-bold ${
                  !isIncome
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                }`}>
                  ৳
                </div>
                <CalculatorInput
                  value={amount}
                  onChange={setAmount}
                  required
                  placeholder="০.০০"
                  className="text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 flex-1 leading-none border-none p-0 focus:ring-0"
                />
                {parseFloat(amount) > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer shrink-0"
                    title="ক্লিয়ার"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>

            {/* Row 5: Description / Note Input */}
            <div className="space-y-1.5">
              <div className="h-11 rounded-xl border border-border/80 bg-background flex items-center px-3 gap-2.5 focus-within:border-foreground/30 transition-all shadow-2xs">
                <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest" })}
                  placeholder="বিবরণ (অপশনাল)"
                  className="flex-1 bg-transparent border-none text-[13.5px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:ring-0 p-0 outline-none"
                />
              </div>
              {noteSuggestions && noteSuggestions.length > 0 && !note && (
                <div className="flex flex-wrap gap-1.5 pt-0.5 px-0.5">
                  {noteSuggestions.slice(0, 4).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setNote(sugg)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 6: Account Selector — Moved down below note & hidden/collapsible by default */}
            {accounts && accounts.length > 0 && (
              <div className="pt-0.5">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground/80" />
                    <span>হিসাব:</span>
                    <span className="font-semibold text-foreground">
                      {accounts.find((a) => a.id === accountId)?.name || accounts[0]?.name || "নগদ"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAccountPicker(!showAccountPicker)}
                    className="text-[11.5px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    {showAccountPicker ? "লুকান" : "হিসাব পরিবর্তন"}
                  </button>
                </div>

                {showAccountPicker && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-1 mt-1.5 bg-muted/20 border border-border/60 rounded-xl animate-in fade-in-50">
                    {accounts.map((a) => {
                      const selected = accountId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setAccountId(a.id);
                            localStorage.setItem(`lastAccount_${ledgerId}`, a.id);
                          }}
                          className={`h-7 px-3 rounded-lg text-xs font-medium shrink-0 border transition-all cursor-pointer ${
                            selected
                              ? "bg-foreground/5 border-foreground/30 text-foreground font-semibold shadow-2xs"
                              : "bg-background border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            </div>

            {/* Pinned Sticky Bottom Submit Bar — ALWAYS visible above keyboard */}
            <div className="shrink-0 px-4 py-3 bg-background border-t border-border/40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(12px,calc(env(safe-area-inset-bottom)+8px))] z-10">
              <button
                type="submit"
                disabled={!hasValidAmount || submitMutation.isPending}
                className={`w-full h-11 sm:h-12 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] ${
                  !hasValidAmount
                    ? "bg-muted text-muted-foreground/50 border border-border/50 cursor-not-allowed"
                    : isIncome
                    ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                    : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
                }`}
              >
                <span>
                  {submitMutation.isPending
                    ? "সংরক্ষণ হচ্ছে..."
                    : isEdit
                    ? "আপডেট করুন"
                    : isIncome
                    ? "আয় যোগ করুন"
                    : "খরচ যোগ করুন"}
                </span>
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
