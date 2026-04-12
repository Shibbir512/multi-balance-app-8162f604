import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import CalculatorInput from "./CalculatorInput";
import { toast } from "sonner";

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
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category_id || "");
      setAccountId(transaction.account_id || "");
      setDate(transaction.date);
      setTime((transaction as any).time || "");
      setNote(transaction.note || "");
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === transaction?.type);
  const isIncome = transaction?.type === "income";

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
    onError: (e: any) => toast.error(e.message),
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
    onError: (e: any) => toast.error(e.message),
  });

  if (!transaction) return null;

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent className="p-0 rounded-t-3xl">
          {/* Header */}
          <div className="px-5 pt-6 pb-4 relative" style={{ background: 'linear-gradient(180deg, hsl(var(--primary) / 0.06), transparent)' }}>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Type badge */}
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                background: isIncome ? 'var(--income-bg)' : 'var(--expense-bg)',
              }}>
                {isIncome ? (
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--income-text-soft)' }} />
                ) : (
                  <TrendingDown className="w-4 h-4" style={{ color: 'var(--expense-text-soft)' }} />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">লেনদেন সম্পাদনা</h2>
                <p className="text-xs text-muted-foreground">
                  {isIncome ? "আয়ের তথ্য পরিবর্তন করুন" : "খরচের তথ্য পরিবর্তন করুন"}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="px-5 pb-6 space-y-4"
          >
            {/* Amount - Premium card */}
            <div className="rounded-2xl p-4 border transition-all duration-200" style={{
              background: 'hsl(var(--card))',
              borderColor: 'var(--glass-border)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">পরিমাণ (৳)</label>
              <CalculatorInput
                value={amount}
                onChange={setAmount}
                required
                className="border-0 bg-transparent text-xl font-semibold h-12 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: isIncome ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
                  মোট: ৳{parseFloat(amount).toLocaleString("bn-BD")}
                </p>
              )}
            </div>

            {/* Category - Card-based */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">ক্যাটাগরি</label>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border overflow-hidden ${
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
              </div>
            </div>

            {/* Account - Card-based */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">অ্যাকাউন্ট</label>
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      accountId === a.id
                        ? "border-primary bg-primary/8 text-foreground shadow-sm"
                        : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/4"
                    }`}
                  >
                    {(a as any).type === "bank" ? "🏦" : (a as any).type === "mobile_banking" ? "📱" : "💵"} {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{
                background: 'hsl(var(--muted))',
                borderColor: 'var(--glass-border)',
              }}>
                <span className="text-sm">📅</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-transparent border-0 outline-none text-sm font-medium text-foreground flex-1 w-full"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{
                background: 'hsl(var(--muted))',
                borderColor: 'var(--glass-border)',
              }}>
                <span className="text-sm">🕒</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-foreground flex-1 w-full"
                />
              </div>
            </div>

            {/* Note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="কিসের জন্য?"
              rows={note ? 2 : 1}
              className="w-full rounded-xl border px-3 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
              style={{
                background: 'hsl(var(--muted))',
                borderColor: 'var(--glass-border)',
              }}
              onFocus={(e) => { e.currentTarget.rows = 3; }}
              onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.rows = 1; }}
            />

            {/* Action buttons */}
            <div className="flex gap-2.5 mt-1">
              <Button
                type="submit"
                className="flex-1 h-12 rounded-2xl text-base font-semibold btn-primary active:scale-[0.96] transition-all duration-200"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "আপডেট হচ্ছে..." : "✅ আপডেট করুন"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="h-12 w-12 rounded-2xl border shrink-0 hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <Trash2 className="w-4.5 h-4.5 text-destructive" />
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
