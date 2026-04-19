import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2, Plus, X, Calendar, Clock, Wallet, Tag, FileText, Check } from "lucide-react";
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
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category_id || "");
      setAccountId(transaction.account_id || "");
      setDate(transaction.date);
      setTime(transaction.time || "");
      setNote(transaction.note || "");
      setShowNewCategory(false);
      setNewCategoryName("");
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === transaction?.type);
  const isIncome = transaction?.type === "income";
  const accentSoft = isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)';
  const accentBg = isIncome ? 'var(--income-bg)' : 'var(--expense-bg)';

  const addCategory = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("categories").insert({
        ledger_id: ledgerId,
        user_id: user!.id,
        name: newCategoryName.trim(),
        type: transaction!.type,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", ledgerId] });
      setCategoryId(data.id);
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("ক্যাটাগরি যোগ হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(amount),
          category_id: categoryId || null,
          account_id: accountId || null,
          date,
          time: time || null,
          note: note || null,
        })
        .eq("id", transaction!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("লেনদেন আপডেট হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").delete().eq("id", transaction!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("লেনদেন মুছে ফেলা হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!transaction) return null;

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent className="p-0 rounded-t-[28px] overflow-hidden">
          {/* Premium Header with accent gradient */}
          <div className="relative px-5 pt-3 pb-4 overflow-hidden">
            {/* Soft accent halo */}
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
                <h2 className="text-base font-bold tracking-tight" style={{ color: accentSoft }}>
                  {isIncome ? "জমা সম্পাদনা" : "খরচ সম্পাদনা"}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isIncome ? "জমার তথ্য পরিবর্তন করুন" : "খরচের তথ্য পরিবর্তন করুন"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="px-4 pb-5 space-y-3.5 max-h-[70vh] overflow-y-auto"
          >
            {/* Premium Amount Card */}
            <div
              className="relative rounded-2xl p-4 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${accentBg}, hsl(var(--card)) 70%)`,
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* decorative corner ring */}
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
                <span
                  className="text-2xl font-bold leading-none"
                  style={{ color: accentSoft }}
                >৳</span>
                <CalculatorInput
                  value={amount}
                  onChange={setAmount}
                  required
                  className="border-0 bg-transparent text-3xl font-bold h-12 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 tracking-tight"
                />
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div className="relative mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                    মোট পরিমাণ
                  </span>
                  <span className="text-xs font-bold" style={{ color: accentSoft }}>
                    ৳{parseFloat(amount).toLocaleString("bn-BD")}
                  </span>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <SectionLabel icon={Tag} label="ক্যাটাগরি" />
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
                <div className="flex flex-wrap gap-1">
                  {filteredCategories.map((c) => {
                    const selected = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 border ${
                          selected
                            ? "text-foreground shadow-sm"
                            : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                        style={selected ? {
                          borderColor: accentSoft,
                          background: `linear-gradient(135deg, ${accentBg}, hsl(var(--card)))`,
                          boxShadow: `0 2px 6px -2px ${accentSoft}40`,
                        } : undefined}
                      >
                        {selected && (
                          <span
                            className="w-1 h-1 rounded-full"
                            style={{ background: accentSoft }}
                          />
                        )}
                        {c.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-200"
                  >
                    <Plus className="w-2.5 h-2.5" strokeWidth={2.5} /> নতুন
                  </button>
                </div>
              )}
            </div>

            {/* Account */}
            <div>
              <SectionLabel icon={Wallet} label="অ্যাকাউন্ট" />
              <div className="flex flex-wrap gap-1">
                {accounts.map((a) => {
                  const selected = accountId === a.id;
                  const icon = a.type === "bank" ? "🏦" : a.type === "mobile_banking" ? "📱" : "💵";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 border ${
                        selected
                          ? "text-foreground shadow-sm"
                          : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                      style={selected ? {
                        borderColor: accentSoft,
                        background: `linear-gradient(135deg, ${accentBg}, hsl(var(--card)))`,
                        boxShadow: `0 2px 6px -2px ${accentSoft}40`,
                      } : undefined}
                    >
                      <span className="text-[11px] leading-none">{icon}</span>
                      <span className="leading-none">{a.name}</span>
                      {selected && (
                        <span className="w-1 h-1 rounded-full" style={{ background: accentSoft }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <SectionLabel icon={Clock} label="তারিখ ও সময়" />
              <div className="grid grid-cols-2 gap-1.5">
                {/* Date */}
                <div
                  className="relative flex items-center gap-1.5 rounded-lg border px-2 h-9 transition-all duration-200 hover:border-primary/40"
                  style={{
                    background: 'hsl(var(--card))',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
                    <Calendar className="w-3 h-3 text-primary" strokeWidth={2.5} />
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="bg-transparent border-0 outline-none text-[11px] font-semibold text-foreground flex-1 w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>

                {/* Time */}
                <div
                  className="relative flex items-center gap-1 rounded-lg border px-2 h-9"
                  style={{
                    background: 'hsl(var(--card))',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
                    <Clock className="w-3 h-3 text-primary" strokeWidth={2.5} />
                  </div>
                  {(() => {
                    const [h24Str = "", mStr = ""] = (time || "").split(":");
                    const h24 = parseInt(h24Str, 10);
                    const hasTime = !isNaN(h24);
                    const period: "AM" | "PM" = hasTime ? (h24 >= 12 ? "PM" : "AM") : "AM";
                    const h12 = hasTime ? ((h24 % 12) || 12) : NaN;
                    const setFromParts = (h12New: number, mNew: string, periodNew: "AM" | "PM") => {
                      let h = h12New % 12;
                      if (periodNew === "PM") h += 12;
                      const hh = String(h).padStart(2, "0");
                      const mm = (mNew || "00").padStart(2, "0");
                      setTime(`${hh}:${mm}`);
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
                              if (isNaN(v)) { setTime(""); return; }
                              const clamped = Math.min(12, Math.max(1, v));
                              setFromParts(clamped, mStr || "00", period);
                            }}
                            className="bg-transparent border-0 outline-none text-[11px] font-bold text-foreground w-5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[11px] font-bold text-muted-foreground/60">:</span>
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
                            className="bg-transparent border-0 outline-none text-[11px] font-bold text-foreground w-5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div
                          className="ml-auto flex rounded-md overflow-hidden border shrink-0"
                          style={{ borderColor: 'var(--glass-border)' }}
                        >
                          <button
                            type="button"
                            onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "AM")}
                            className={`px-1.5 py-0.5 text-[9px] font-bold transition-all ${
                              period === "AM"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "PM")}
                            className={`px-1.5 py-0.5 text-[9px] font-bold transition-all ${
                              period === "PM"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-transparent text-muted-foreground hover:text-foreground"
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
              <SectionLabel icon={FileText} label="নোট" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="কিসের জন্য? (ঐচ্ছিক)"
                rows={1}
                className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200 placeholder:text-muted-foreground/40 min-h-[36px]"
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: 'var(--glass-border)',
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1 h-12 rounded-2xl text-sm font-bold btn-primary active:scale-[0.97] transition-all duration-200 shadow-lg shadow-primary/20"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  "আপডেট হচ্ছে..."
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" strokeWidth={3} />
                    আপডেট করুন
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="h-12 w-12 rounded-2xl border shrink-0 hover:bg-destructive/10 hover:border-destructive/40 transition-all duration-200"
                style={{ borderColor: 'var(--glass-border)' }}
                aria-label="মুছে ফেলুন"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </form>
        </BottomSheetContent>
      </BottomSheet>

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
