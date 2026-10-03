import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, orderBy, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Ledger, Account, Category, Transaction, GroceryMasterItem, GroceryBatch, GroceryBatchItem } from "@/integrations/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2, Plus, X, Calendar, Clock, Wallet, Tag, FileText, Check, Pencil, ChevronDown, Calculator } from "lucide-react";
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
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string; type?: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  ledgerId: string;
}

const SectionLabel = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-1.5 mb-2 px-0.5">
    <Icon className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.12em]">{label}</span>
    <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-1" />
  </div>
);

const TransactionEditDialog = ({ transaction, open, onOpenChange, accounts, categories, ledgerId }: Props) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);

  useEffect(() => {
    if (transaction) {
      setTxType(transaction.type as "income" | "expense");
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category_id || "");
      setAccountId(transaction.account_id || "");
      setDate(transaction.date);
      setTime(transaction.time || "");
      setNote(transaction.note || "");
      setShowNewCategory(false);
      setNewCategoryName("");
      setEditCategoryId(null);
      setEditCategoryName("");
      setIsCategoryExpanded(false);
      setIsAccountExpanded(false);
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === txType);
  const isIncome = txType === "income";
  const accentSoft = isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)';
  const accentBg = isIncome ? 'var(--income-bg)' : 'var(--expense-bg)';

  const addCategory = useMutation({
    mutationFn: async () => {
      const catData = {
        ledger_id: ledgerId,
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
      setCategoryId(data.id);
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("à¦•à§چà¦¯à¦¾à¦ںà¦¾à¦—à¦°à¦؟ à¦¯à§‹à¦— à¦¹à¦¯à¦¼à§‡à¦›à§‡!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await updateDoc(doc(db, "categories", id), { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      setEditCategoryId(null);
      setEditCategoryName("");
      toast.success("à¦•à§چà¦¯à¦¾à¦ںà¦¾à¦—à¦°à¦؟ à¦†à¦ھà¦،à§‡à¦ں à¦¹à¦¯à¦¼à§‡à¦›à§‡!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "categories", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      if (categoryId === editCategoryId) setCategoryId("");
      toast.success("à¦•à§چà¦¯à¦¾à¦ںà¦¾à¦—à¦°à¦؟ à¦®à§پà¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateDoc(doc(db, "transactions", transaction!.id as string), {
          type: txType,
          amount: parseFloat(amount),
          category_id: categoryId || null,
          account_id: accountId || null,
          date,
          time: time || null,
          note: note || null,
        });
      const error = null;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("à¦²à§‡à¦¨à¦¦à§‡à¦¨ à¦†à¦ھà¦،à§‡à¦ں à¦¹à¦¯à¦¼à§‡à¦›à§‡!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteDoc(doc(db, "transactions", transaction!.id as string));
      const error = null;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("à¦²à§‡à¦¨à¦¦à§‡à¦¨ à¦®à§پà¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!transaction) return null;

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent className="p-0 overflow-hidden border border-border/10
          md:!w-[800px] md:!max-w-[calc(100vw-48px)] md:h-[720px] md:max-h-[calc(100vh-48px)] 
          md:bg-background/95 md:backdrop-blur-xl">
          
          {/* Header */}
          <div className="flex items-center p-5 lg:p-6 pb-4 relative">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${isIncome ? 'bg-[#DCFCE7] text-[#22C55E] dark:bg-[#22C55E]/10' : 'bg-[#FEE2E2] text-[#EF4444] dark:bg-[#EF4444]/10'}`}>
              {isIncome ? <TrendingUp className="w-6 h-6" strokeWidth={2.5} /> : <TrendingDown className="w-6 h-6" strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-[18px] lg:text-[20px] font-bold text-foreground">নতুন লেনদেন</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">দ্রুত আয় বা খরচ যোগ করুন</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-5 right-5 lg:top-6 lg:right-6 w-9 h-9 lg:w-10 lg:h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="px-5 lg:px-6 pb-5 lg:pb-6 space-y-5 lg:space-y-6 max-h-[75vh] overflow-y-auto"
          >
            {/* Segment Toggle */}
            <div className="flex h-[52px] lg:h-[56px] bg-muted/40 border border-border rounded-xl lg:rounded-2xl p-1 gap-1">
              <button
                type="button"
                onClick={() => { setTxType("income"); setCategoryId(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-all ${
                  isIncome
                    ? "bg-[#DCFCE7] text-[#16B981] border border-[#22C55E]/30 dark:bg-[#16B981]/20 dark:text-[#4ADE80] dark:border-[#4ADE80]/30 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> আয়
              </button>
              <button
                type="button"
                onClick={() => { setTxType("expense"); setCategoryId(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-all ${
                  !isIncome
                    ? "bg-[#FEE2E2] text-[#EF4444] border border-[#EF4444]/30 dark:bg-[#EF4444]/20 dark:text-[#F87171] dark:border-[#F87171]/30 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <TrendingDown className="w-4 h-4" /> খরচ
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-semibold text-foreground">পরিমাণ</label>
                <span className="text-[13px] text-muted-foreground">BDT</span>
              </div>
              <div className={`h-[72px] lg:h-[76px] flex items-center px-4 lg:px-5 border-2 rounded-xl lg:rounded-2xl transition-all ${
                isIncome ? 'bg-green-50/50 border-green-500/30 dark:bg-[#1C2538] dark:border-green-500/20' : 'bg-[#FFF7F7] border-[#EF4444] dark:bg-[#1C2538] dark:border-[#EF4444]/40'
              }`}>
                <span className={`text-[32px] lg:text-[36px] font-extrabold mr-3 ${isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>৳</span>
                <CalculatorInput
                  value={amount}
                  onChange={setAmount}
                  required
                  className="flex-1 bg-transparent border-none text-[32px] lg:text-[36px] font-extrabold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none placeholder:text-muted-foreground/30 h-auto"
                />
                <button type="button" className="text-muted-foreground">
                  <Calculator className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-semibold text-foreground">ক্যাটাগরি</label>
                <button type="button" className="text-[13px] font-medium text-primary hover:underline">সব দেখুন &rarr;</button>
              </div>
              
              <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-3 no-scrollbar pb-1 -mx-2 px-2 md:mx-0 md:px-0" style={{ scrollSnapType: 'x mandatory' }}>
                {filteredCategories.slice(0, 8).map((c) => {
                  const selected = categoryId === c.id;
                  const config = getCategoryConfig(c.name, txType);
                  const Icon = config.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      style={{ scrollSnapAlign: 'start' }}
                      className={`flex shrink-0 w-[90px] md:w-auto h-[48px] items-center gap-2 px-3 rounded-[12px] border transition-all ${
                        selected 
                          ? (isIncome ? 'bg-[#DCFCE7] border-[#22C55E] text-[#16B981] dark:bg-[#16B981]/10' : 'bg-[#FEE2E2] border-[#EF4444] text-[#EF4444] dark:bg-[#EF4444]/10')
                          : 'bg-card border-border hover:bg-muted/30 text-foreground'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: selected ? undefined : config.text }} />
                      <span className="text-[13px] font-medium truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-foreground">অ্যাকাউন্ট</label>
              <div 
                className="h-[52px] border border-border rounded-xl bg-card flex items-center justify-between px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsAccountExpanded(!isAccountExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-[#22C55E]/10 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <span className="text-[15px] font-medium text-foreground">
                    {accountId ? accounts.find(a => a.id === accountId)?.name : "নগদ"}
                  </span>
                </div>
                <ChevronDown className={`w-[18px] h-[18px] text-muted-foreground transition-transform ${isAccountExpanded ? "rotate-180" : ""}`} />
              </div>
              {isAccountExpanded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {accounts.map(a => (
                    <button key={a.id} type="button" onClick={() => { setAccountId(a.id); setIsAccountExpanded(false); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${accountId === a.id ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border hover:bg-muted/50 text-muted-foreground'}`}>
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time Row */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5 min-w-0">
                <label className="text-[13px] font-semibold text-foreground">তারিখ</label>
                <div className="h-[52px] border border-border rounded-xl bg-card flex items-center px-4 gap-3 hover:bg-muted/30 transition-colors relative">
                  <Calendar className="w-[18px] h-[18px] text-muted-foreground shrink-0 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="flex-1 bg-transparent border-none text-[15px] font-medium text-foreground focus:ring-0 p-0 outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-1.5 min-w-0">
                <label className="text-[13px] font-semibold text-foreground">সময়</label>
                <div className="h-[52px] border border-border rounded-xl bg-card flex items-center px-3 gap-2 hover:bg-muted/30 transition-colors">
                  <Clock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                  <input 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)}
                    className="flex-1 bg-transparent border-none text-[15px] font-medium text-foreground focus:ring-0 p-0 outline-none min-w-0 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-foreground">নোট</label>
              <div className="h-[52px] border border-border rounded-xl bg-card flex items-center px-4 gap-3 hover:bg-muted/30 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                <FileText className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="কিসের জন্য খরচটি করা হলো..."
                  className="flex-1 bg-transparent border-none text-[15px] font-medium text-foreground placeholder:text-muted-foreground focus:ring-0 p-0 outline-none"
                />
              </div>
            </div>
            
          </form>

          {/* Footer Actions */}
          <div className="p-4 lg:p-6 flex gap-3 border-t border-border bg-background/80 backdrop-blur-md sticky bottom-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-1/3 lg:w-[140px] h-[52px] lg:h-[56px] rounded-xl lg:rounded-[14px] bg-[#F3F4F8] dark:bg-[#1C2538] text-[#475569] dark:text-[#94A3B8] font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-[#E5E7EB] dark:hover:bg-[#263449] transition-colors"
            >
              <X className="w-[18px] h-[18px]" /> বাতিল
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className={`flex-1 h-[52px] lg:h-[56px] rounded-xl lg:rounded-[14px] font-semibold text-[15px] flex items-center justify-center gap-2 text-white transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${
                isIncome ? 'bg-[#10B981] hover:bg-[#059669] hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)]' : 'bg-[#EF5261] hover:bg-[#E11D48] hover:shadow-[0_6px_16px_rgba(239,82,97,0.35)] dark:bg-[#EF4444] dark:hover:bg-[#DC2626]'
              }`}
            >
              <Check className="w-[18px] h-[18px]" strokeWidth={3} /> {isIncome ? 'আয় যোগ করুন' : 'খরচ যোগ করুন'}
            </button>
          </div>

        </BottomSheetContent>
      </BottomSheet>
      
      {/* Alert Dialog code is kept intact just in case */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl bg-popover border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>লেনদেন মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই লেনদেন স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {deleteMutation.isPending ? "মুছছে..." : "মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionEditDialog;
