import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, Clock, Search, Plus, X, Wallet, Receipt, Zap, Trash2 } from "lucide-react";
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

const formatBnDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = [
    "জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"
  ];
  const bnDigits = "০১২৩৪৫৬৭৮৯";
  const toBn = (n: number | string) =>
    String(n).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);

  const dayBn = toBn(d);
  const monthBn = months[m - 1] || "";
  const yearBn = toBn(y);
  return `${dayBn} ${monthBn}, ${yearBn}`;
};

const formatBnTime = (timeStr: string): string => {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
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
        setDate(transaction.date || new Date().toISOString().split("T")[0]);
        setTime(transaction.time || new Date().toTimeString().slice(0, 5));
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
        setDate(new Date().toISOString().split("T")[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setNote("");
      }
      setShowCategorySearch(false);
      setNewCategoryName("");
    } else {
      // Reset the ref when dialog closes so it re-initializes next time
      initializedTxRef.current = undefined;
    }
  }, [open, transaction, defaultType, ledgerId, accounts]);

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
            {/* Row 1: Date & Time Pills */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Date Pill */}
              <div className="relative h-11 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
                <span className="text-[13.5px] font-semibold text-blue-600 dark:text-blue-400 select-none">
                  {formatBnDate(date)}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                />
              </div>

              {/* Time Pill */}
              <div className="relative h-11 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
                <span className="text-[13.5px] font-semibold text-blue-600 dark:text-blue-400 select-none">
                  {formatBnTime(time)}
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                />
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
