import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Pencil, ShoppingCart, Calculator, CreditCard, Tag } from "lucide-react";
import { toast } from "sonner";
import GroceryModule from "@/components/GroceryModule";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";
import ZakatCalculator from "@/components/ZakatCalculator";
import TransactionFilters from "@/components/TransactionFilters";
import PdfExport from "@/components/PdfExport";
import TransactionEditDialog from "@/components/TransactionEditDialog";
import CalculatorInput from "@/components/CalculatorInput";

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
  const [activeTab, setActiveTab] = useState("transactions");

  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const [editTx, setEditTx] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: ledger } = useQuery({
    queryKey: ["ledger", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledgers").select("*").eq("id", ledgerId!).single();
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
      return data;
    },
  });

  const filteredTransactions = transactions?.filter((t) => {
    if (filterMonth !== "all" || filterYear !== "all") {
      const [y, m] = t.date.split("-");
      if (filterMonth !== "all" && m !== filterMonth) return false;
      if (filterYear !== "all" && y !== filterYear) return false;
    }
    return true;
  }) ?? [];

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

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
        note: txNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      setTxDialogOpen(false);
      setTxAmount("");
      setTxCategory("");
      setTxAccount("");
      setTxNote("");
      toast.success(txType === "income" ? "আয় যোগ হয়েছে!" : "খরচ যোগ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
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
    setTxDialogOpen(true);
  };

  const tabs = [
    { id: "transactions", label: "লেনদেন", icon: CreditCard },
    { id: "grocery", label: "বাজার", icon: ShoppingCart },
    { id: "zakat", label: "যাকাত", icon: Calculator },
    { id: "accounts", label: "অ্যাকাউন্ট", icon: Wallet },
    { id: "categories", label: "ক্যাটাগরি", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Dark Header */}
      <div className="sticky top-0 z-10 gradient-header px-4 pt-3 pb-4" style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.5)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold text-white/90 truncate flex-1">{ledger?.name ?? "..."}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Hero Balance Card - floating */}
        <div className="glass rounded-2xl p-4 -mt-2 mb-4 animate-fade-in-up" style={{ boxShadow: '0 4px 24px -6px rgba(99,102,241,0.15)', transform: 'translateY(-2px)' }}>
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mb-0.5">মোট ব্যালেন্স</p>
          <p className="text-2xl font-extrabold text-foreground mb-3">৳{totalBalance.toLocaleString("bn-BD")}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500/80" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400/60 font-medium">আয়</p>
                <p className="text-xs font-bold text-emerald-400/90">৳{totalIncome.toLocaleString("bn-BD")}</p>
              </div>
            </div>
            <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-red-500/80" />
              </div>
              <div>
                <p className="text-[10px] text-red-400/60 font-medium">খরচ</p>
                <p className="text-xs font-bold text-red-400/90">৳{totalExpense.toLocaleString("bn-BD")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Button
            onClick={() => openTxDialog("income")}
            className="gap-2 h-11 rounded-2xl bg-white/[0.04] text-emerald-400/80 border border-white/[0.08] hover:bg-white/[0.07] font-semibold btn-press"
            variant="ghost"
          >
            <ArrowUpRight className="w-4 h-4" /> আয় যোগ
          </Button>
          <Button
            onClick={() => openTxDialog("expense")}
            className="gap-2 h-11 rounded-2xl bg-white/[0.04] text-red-400/80 border border-white/[0.08] hover:bg-white/[0.07] font-semibold btn-press"
            variant="ghost"
          >
            <ArrowDownRight className="w-4 h-4" /> খরচ যোগ
          </Button>
        </div>

        {reminders && reminders.length > 0 && (
          <div className="mb-4">
            <GroceryReminders reminders={reminders} compact />
          </div>
        )}

        {/* Pill-style Tabs - horizontal scroll, no wrap */}
        <div className="glass rounded-2xl p-1 flex gap-1 mb-4 overflow-x-auto no-scrollbar flex-nowrap animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pill-tab flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 justify-center min-w-0 px-3 ${
                  activeTab === tab.id ? "pill-tab-active" : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "transactions" && (
          <div className="space-y-2.5 pb-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TransactionFilters
                month={filterMonth}
                year={filterYear}
                onMonthChange={setFilterMonth}
                onYearChange={setFilterYear}
                onClear={() => { setFilterMonth("all"); setFilterYear("all"); }}
              />
              {filteredTransactions.length > 0 && (
                <PdfExport ledgerName={ledger?.name ?? "Report"} transactions={filteredTransactions as any} />
              )}
            </div>

            {!filteredTransactions.length ? (
              <div className="premium-card p-10 text-center border-dashed border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">কোনো লেনদেন নেই</p>
                <p className="text-xs text-muted-foreground mt-1">আয় বা খরচ যোগ করুন</p>
              </div>
            ) : (
              filteredTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="premium-card p-3.5 cursor-pointer stagger-item"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                  onClick={() => { setEditTx(tx); setEditOpen(true); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        tx.type === "income"
                          ? "bg-emerald-500/10 text-emerald-500/70"
                          : "bg-red-500/10 text-red-500/70"
                      }`}>
                        {tx.type === "income" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{(tx.categories as any)?.name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {(tx.accounts as any)?.name || "—"} • {tx.date}
                        </p>
                        {tx.note && <p className="text-[11px] text-muted-foreground mt-0.5">{tx.note}</p>}
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${tx.type === "income" ? "text-emerald-400/85" : "text-red-400/85"}`}>
                      {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "grocery" && (
          <div className="pb-8">
            <GroceryModule ledgerId={ledgerId!} accounts={accounts ?? []} categories={categories ?? []} />
          </div>
        )}

        {activeTab === "zakat" && (
          <div className="pb-8">
            <ZakatCalculator ledgerId={ledgerId!} />
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="space-y-2.5 pb-8">
            {accounts?.map((acc) => (
              <div key={acc.id} className="premium-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{acc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.type.replace("_", " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-4 pb-8">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" /> আয়ের ক্যাটাগরি
              </h3>
              <div className="space-y-1.5">
                {categories?.filter((c) => c.type === "income").map((c) => (
                  <div key={c.id} className="premium-card p-3">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" /> খরচের ক্যাটাগরি
              </h3>
              <div className="space-y-1.5">
                {categories?.filter((c) => c.type === "expense").map((c) => (
                  <div key={c.id} className="premium-card p-3">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl bg-popover border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg">{txType === "income" ? "আয় যোগ করুন" : "খরচ যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-4">
            <div className="space-y-2">
              <Label>পরিমাণ (৳)</Label>
              <CalculatorInput value={txAmount} onChange={setTxAmount} placeholder="যেমন: 500+200" required />
            </div>
            <div className="space-y-2">
              <Label>ক্যাটাগরি (ঐচ্ছিক)</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>অ্যাকাউন্ট (ঐচ্ছিক)</Label>
              <Select value={txAccount} onValueChange={setTxAccount}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="অ্যাকাউন্ট বাছুন" /></SelectTrigger>
                <SelectContent>
                  {accounts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>তারিখ</Label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>নোট (ঐচ্ছিক)</Label>
              <Input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="নোট লিখুন..." className="rounded-xl" />
            </div>
            <Button type="submit" className="w-full h-11 rounded-2xl text-base font-semibold gradient-primary shadow-md shadow-indigo-500/20" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        transaction={editTx}
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        ledgerId={ledgerId!}
      />
    </div>
  );
};

export default LedgerDetailPage;
