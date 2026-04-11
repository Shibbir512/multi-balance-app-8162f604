import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  // Filters
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  // Edit
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

  // Apply filters
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
      {/* Premium Gradient Header */}
      <div className="sticky top-0 z-10 gradient-primary px-4 pt-5 pb-8 shadow-hero">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white/90 hover:text-white hover:bg-white/15 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-white truncate flex-1">{ledger?.name ?? "..."}</h1>
          </div>

          {/* Hero Balance Card */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">মোট ব্যালেন্স</p>
            <p className="text-3xl font-extrabold text-white mb-4">৳{totalBalance.toLocaleString("bn-BD")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-white/60 font-medium">আয়</p>
                  <p className="text-sm font-bold text-white">৳{totalIncome.toLocaleString("bn-BD")}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-white/60 font-medium">খরচ</p>
                  <p className="text-sm font-bold text-white">৳{totalExpense.toLocaleString("bn-BD")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Button
            onClick={() => openTxDialog("income")}
            className="gap-2 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-card font-semibold"
            variant="ghost"
          >
            <ArrowUpRight className="w-4 h-4" /> আয় যোগ
          </Button>
          <Button
            onClick={() => openTxDialog("expense")}
            className="gap-2 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 shadow-card font-semibold"
            variant="ghost"
          >
            <ArrowDownRight className="w-4 h-4" /> খরচ যোগ
          </Button>
        </div>

        {reminders && reminders.length > 0 && (
          <div className="mb-5">
            <GroceryReminders reminders={reminders} compact />
          </div>
        )}

        {/* Pill-style Tabs */}
        <div className="bg-muted/60 rounded-2xl p-1.5 flex gap-1 mb-5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pill-tab flex items-center gap-1.5 whitespace-nowrap flex-1 justify-center min-w-0 ${
                  activeTab === tab.id ? "pill-tab-active" : "text-muted-foreground hover:text-foreground hover:bg-background/60"
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
          <div className="space-y-3 pb-8">
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
              <div className="premium-card p-10 text-center border-dashed">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">কোনো লেনদেন নেই</p>
                <p className="text-xs text-muted-foreground mt-1">আয় বা খরচ যোগ করুন</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="premium-card p-4 cursor-pointer"
                  onClick={() => { setEditTx(tx); setEditOpen(true); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === "income"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-500"
                      }`}>
                        {tx.type === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{(tx.categories as any)?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(tx.accounts as any)?.name || "—"} • {tx.date}
                        </p>
                        {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-bold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                      </p>
                    </div>
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
          <div className="space-y-3 pb-8">
            {accounts?.map((acc) => (
              <div key={acc.id} className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{acc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.type.replace("_", " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-5 pb-8">
            <div>
              <h3 className="text-sm font-bold text-emerald-600 mb-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> আয়ের ক্যাটাগরি
              </h3>
              <div className="space-y-2">
                {categories?.filter((c) => c.type === "income").map((c) => (
                  <div key={c.id} className="premium-card p-3.5">
                    <p className="text-sm font-medium">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-500 mb-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" /> খরচের ক্যাটাগরি
              </h3>
              <div className="space-y-2">
                {categories?.filter((c) => c.type === "expense").map((c) => (
                  <div key={c.id} className="premium-card p-3.5">
                    <p className="text-sm font-medium">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
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
            <Button type="submit" className="w-full h-12 rounded-2xl text-base font-semibold gradient-primary shadow-md" disabled={addTransaction.isPending}>
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
