import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2, Plus, X, Calendar, Clock, Wallet, FileText, Check, ChevronDown, Calculator } from "lucide-react";
import CalculatorInput from "./CalculatorInput";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getCategoryConfig } from "@/lib/categoryColors";

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
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);

  useEffect(() => {
    if (open) {
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
      setShowNewCategory(false);
      setNewCategoryName("");
      setIsAccountExpanded(false);
    }
  }, [open, transaction, defaultType, ledgerId, accounts]);

  const filteredCategories = categories.filter((c) => c.type === txType);
  const isIncome = txType === "income";

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
      setShowNewCategory(false);
      toast.success("ক্যাটাগরি যোগ হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
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
          className="p-0 overflow-hidden border border-border/10
          md:!w-[740px] md:!max-w-[calc(100vw-48px)] md:!h-[670px] md:max-h-[calc(100vh-32px)] 
          md:bg-background/95 md:backdrop-blur-xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b border-border/40 relative shrink-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3.5 shrink-0 ${
                isIncome
                  ? "bg-[#DCFCE7] text-[#22C55E] dark:bg-[#22C55E]/10"
                  : "bg-[#FEE2E2] text-[#EF4444] dark:bg-[#EF4444]/10"
              }`}
            >
              {isIncome ? (
                <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="w-5 h-5" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-foreground leading-tight">
                {isEdit ? "লেনদেন এডিট" : "নতুন লেনদেন"}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-tight">
                {isEdit ? "লেনদেনের তথ্য পরিবর্তন করুন" : "দ্রুত আয় বা খরচ যোগ করুন"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-6 w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitMutation.mutate();
            }}
            className="flex-1 px-6 py-4 space-y-3.5 sm:space-y-4 overflow-y-auto no-scrollbar flex flex-col justify-between"
          >
            {/* 1. Segment Toggle */}
            <div className="flex h-[44px] bg-muted/40 border border-border rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setCategoryId("");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-semibold transition-all ${
                  isIncome
                    ? "bg-[#DCFCE7] text-[#16B981] border border-[#22C55E]/30 dark:bg-[#16B981]/20 dark:text-[#4ADE80] dark:border-[#4ADE80]/30 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> আয়
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setCategoryId("");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-semibold transition-all ${
                  !isIncome
                    ? "bg-[#FEE2E2] text-[#EF4444] border border-[#EF4444]/30 dark:bg-[#EF4444]/20 dark:text-[#F87171] dark:border-[#F87171]/30 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <TrendingDown className="w-4 h-4" /> খরচ
              </button>
            </div>

            {/* 2. Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[12.5px] font-semibold text-foreground">পরিমাণ</label>
                <span className="text-[11.5px] text-muted-foreground font-medium">BDT</span>
              </div>
              <div
                className={`h-[64px] flex items-center px-4 border-2 rounded-xl transition-all ${
                  isIncome
                    ? "bg-green-50/50 border-green-500/40 dark:bg-[#1C2538] dark:border-green-500/30"
                    : "bg-[#FFF7F7] border-[#EF4444]/40 dark:bg-[#1C2538] dark:border-[#EF4444]/40"
                }`}
              >
                <span
                  className={`text-[36px] sm:text-[40px] font-extrabold mr-3 select-none leading-none ${
                    isIncome ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  ৳
                </span>
                <CalculatorInput
                  value={amount}
                  onChange={setAmount}
                  required
                  placeholder="০"
                  className="text-[34px] sm:text-[38px] font-extrabold text-foreground placeholder:text-muted-foreground/25 leading-none"
                />
                <div className="ml-auto pl-3 flex items-center shrink-0 pointer-events-none">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center text-muted-foreground">
                    <Calculator className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Note - Directly under Amount */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-semibold text-foreground">নোট</label>
              <div className="h-[46px] border-2 border-[#CBD5E1] dark:border-[rgba(255,255,255,0.18)] rounded-xl bg-card flex items-center px-3.5 gap-2.5 shadow-2xs hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="কিসের জন্য খরচ বা আয় করা হলো..."
                  className="flex-1 bg-transparent border-none text-[14px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:ring-0 p-0 outline-none"
                />
              </div>
              {noteSuggestions && noteSuggestions.length > 0 && !note && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {noteSuggestions.slice(0, 4).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setNote(sugg)}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Category - Compact size, all shown */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[12.5px] font-semibold text-foreground">
                  ক্যাটাগরি <span className="text-[11.5px] text-muted-foreground font-normal">({filteredCategories.length}টি)</span>
                </label>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2">
                {filteredCategories.map((c) => {
                  const selected = categoryId === c.id;
                  const config = getCategoryConfig(c.name, txType);
                  const Icon = config.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(selected ? "" : c.id)}
                      className={`h-[38px] px-2.5 rounded-[10px] flex items-center gap-2 border transition-all text-left ${
                        selected
                          ? isIncome
                            ? "bg-[#DCFCE7] border-[#22C55E] text-[#16B981] dark:bg-[#16B981]/15 font-semibold shadow-xs"
                            : "bg-[#FEE2E2] border-[#EF4444] text-[#EF4444] dark:bg-[#EF4444]/15 font-semibold shadow-xs"
                          : "bg-card border-border/80 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <Icon
                        className="w-4 h-4 shrink-0"
                        style={{ color: selected ? undefined : config.text }}
                      />
                      <span className="text-[12px] font-medium truncate leading-none">{c.name}</span>
                    </button>
                  );
                })}

                {/* Add new category button / input */}
                {showNewCategory ? (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="নতুন নাম..."
                      className="h-[38px] text-[12px] rounded-[10px] px-2.5"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-[38px] w-[38px] shrink-0 rounded-[10px]"
                      disabled={!newCategoryName.trim() || addCategory.isPending}
                      onClick={() => addCategory.mutate()}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-[38px] w-[38px] shrink-0 rounded-[10px]"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="h-[38px] px-2.5 rounded-[10px] flex items-center justify-center gap-1.5 border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all text-[12px] font-medium"
                  >
                    <Plus className="w-4 h-4" /> নতুন
                  </button>
                )}
              </div>
            </div>

            {/* 5. Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[12.5px] font-semibold text-foreground">তারিখ</label>
                <div className="h-[44px] border border-border rounded-xl bg-card flex items-center px-3.5 gap-2.5 hover:bg-muted/30 transition-colors relative">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="flex-1 bg-transparent border-none text-[13.5px] font-medium text-foreground focus:ring-0 p-0 outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[12.5px] font-semibold text-foreground">সময়</label>
                <div className="h-[44px] border border-border rounded-xl bg-card flex items-center px-3.5 gap-2 hover:bg-muted/30 transition-colors">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="flex-1 bg-transparent border-none text-[13.5px] font-medium text-foreground focus:ring-0 p-0 outline-none min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* 6. Account - At the very bottom */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-semibold text-foreground">অ্যাকাউন্ট</label>
              <div
                className="h-[44px] border border-border rounded-xl bg-card flex items-center justify-between px-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsAccountExpanded(!isAccountExpanded)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-[#22C55E]/10 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <span className="text-[14px] font-medium text-foreground">
                    {accountId ? accounts.find((a) => a.id === accountId)?.name : "নগদ"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    isAccountExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
              {isAccountExpanded && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 p-2 bg-muted/20 border border-border/50 rounded-xl">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAccountId(a.id);
                        setIsAccountExpanded(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        accountId === a.id
                          ? "bg-primary/10 border-primary text-primary font-semibold"
                          : "bg-card border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 flex gap-3 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
            {isEdit && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="w-12 h-[50px] rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center hover:bg-destructive/20 transition-colors shrink-0"
                title="মুছে ফেলুন"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-32 sm:w-36 h-[50px] rounded-xl bg-[#F3F4F8] dark:bg-[#1C2538] text-[#475569] dark:text-[#94A3B8] font-semibold text-[15px] flex items-center justify-center gap-1.5 hover:bg-[#E5E7EB] dark:hover:bg-[#263449] transition-colors"
            >
              <X className="w-4 h-4" /> বাতিল
            </button>
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className={`flex-1 h-[50px] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 text-white transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${
                isIncome
                  ? "bg-[#10B981] hover:bg-[#059669] hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)]"
                  : "bg-[#EF5261] hover:bg-[#E11D48] hover:shadow-[0_6px_16px_rgba(239,82,97,0.35)] dark:bg-[#EF4444] dark:hover:bg-[#DC2626]"
              }`}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              {isEdit ? "আপডেট করুন" : isIncome ? "আয় যোগ করুন" : "খরচ যোগ করুন"}
            </button>
          </div>
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
