import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2, Plus, X, Calendar } from "lucide-react";
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
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      setShowDatePicker(false);
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === transaction?.type);
  const isIncome = transaction?.type === "income";

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
        <BottomSheetContent className="p-0 rounded-t-3xl">
          {/* Header - compact */}
          <div className="px-4 pt-4 pb-2 relative" style={{ background: 'linear-gradient(180deg, hsl(var(--primary) / 0.06), transparent)' }}>
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                background: isIncome ? 'var(--income-bg)' : 'var(--expense-bg)',
              }}>
                {isIncome ? (
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--income-text-soft)' }} />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--expense-text-soft)' }} />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">লেনদেন সম্পাদনা</h2>
                <p className="text-[10px] text-muted-foreground">
                  {isIncome ? "জমার তথ্য পরিবর্তন করুন" : "খরচের তথ্য পরিবর্তন করুন"}
                </p>
              </div>
            </div>
          </div>

          {/* Form - compact spacing */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="px-4 pb-4 space-y-2.5"
          >
            {/* Amount */}
            <div className="rounded-xl p-3 border transition-all duration-200" style={{
              background: 'hsl(var(--card))',
              borderColor: 'var(--glass-border)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">পরিমাণ (৳)</label>
              <CalculatorInput
                value={amount}
                onChange={setAmount}
                required
                className="border-0 bg-transparent text-lg font-semibold h-10 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-[11px] mt-1 font-medium" style={{ color: isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
                  মোট: ৳{parseFloat(amount).toLocaleString("bn-BD")}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">ক্যাটাগরি</label>
              {showNewCategory ? (
                <div className="flex gap-1.5">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="ক্যাটাগরি নাম"
                    className="form-input flex-1 h-8 text-xs"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg btn-primary"
                    disabled={!newCategoryName.trim() || addCategory.isPending}
                    onClick={() => addCategory.mutate()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 rounded-lg"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {filteredCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border overflow-hidden ${
                        categoryId === c.id
                          ? "border-primary bg-primary/8 text-foreground shadow-sm"
                          : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/4"
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r transition-opacity duration-200 ${categoryId === c.id ? "opacity-100" : "opacity-0"}`}
                        style={{ background: isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}
                      />
                      {c.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    <Plus className="w-3 h-3" /> নতুন
                  </button>
                </div>
              )}
            </div>

            {/* Account */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">অ্যাকাউন্ট</label>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                      accountId === a.id
                        ? "border-primary bg-primary/8 text-foreground shadow-sm"
                        : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/4"
                    }`}
                  >
                    {a.type === "bank" ? "🏦" : a.type === "mobile_banking" ? "📱" : "💵"} {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">তারিখ ও সময়</label>
              {!showDatePicker ? (
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center justify-between border rounded-xl px-2.5 py-2 transition-all duration-200 hover:bg-primary/5 hover:border-primary/30"
                  style={{
                    background: 'hsl(var(--card))',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground">
                        {date === new Date().toISOString().split("T")[0] ? "আজ" : date}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {time || ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-primary underline underline-offset-2">পরিবর্তন করুন</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                  <div className="relative flex items-center rounded-lg border px-2.5 py-2" style={{
                    background: 'hsl(var(--muted))',
                    borderColor: 'var(--glass-border)',
                  }}>
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="bg-transparent border-0 outline-none text-xs font-medium text-foreground flex-1 w-full pl-1.5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                  <div className="rounded-lg border px-2 py-1.5" style={{
                    background: 'hsl(var(--muted))',
                    borderColor: 'var(--glass-border)',
                  }}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">🕒</span>
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
                              className="bg-transparent border-0 outline-none text-xs font-medium text-foreground w-7 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-muted-foreground">:</span>
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
                              className="bg-transparent border-0 outline-none text-xs font-medium text-foreground w-7 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="ml-auto flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--glass-border)' }}>
                              <button
                                type="button"
                                onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "AM")}
                                className={`px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${period === "AM" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setFromParts(isNaN(h12) ? 12 : h12, mStr || "00", "PM")}
                                className={`px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${period === "PM" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}
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
              )}
            </div>

            {/* Note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="কিসের জন্য?"
              rows={1}
              className="w-full rounded-lg border px-2.5 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
              style={{
                background: 'hsl(var(--muted))',
                borderColor: 'var(--glass-border)',
              }}
              onFocus={(e) => { e.currentTarget.rows = 2; }}
              onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.rows = 1; }}
            />

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-11 rounded-xl text-sm font-semibold btn-primary active:scale-[0.96] transition-all duration-200"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "আপডেট হচ্ছে..." : "✅ আপডেট করুন"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="h-11 w-11 rounded-xl border shrink-0 hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200"
                style={{ borderColor: 'var(--glass-border)' }}
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
