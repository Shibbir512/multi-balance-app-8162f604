import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Pencil, ShoppingCart, Calculator, CreditCard, Tag } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import GroceryModule from "@/components/GroceryModule";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";
import ZakatCalculator from "@/components/ZakatCalculator";
import TransactionFilters from "@/components/TransactionFilters";
import PdfExport from "@/components/PdfExport";
import TransactionEditDialog from "@/components/TransactionEditDialog";
import CalculatorInput from "@/components/CalculatorInput";
import MonthlyChart from "@/components/MonthlyChart";
import ExpensePieChart from "@/components/ExpensePieChart";

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
  const [fabOpen, setFabOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

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
    <div className="min-h-screen page-gradient">
      {/* Compact Dark Header */}
      <div className="sticky top-0 z-10 gradient-header px-4 pt-3 pb-4">
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
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Hero Balance Card - floating */}
        <div className="hero-card p-4 -mt-2 mb-4 animate-fade-in-up" style={{ transform: 'translateY(-2px)' }}>
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mb-0.5">মোট ব্যালেন্স</p>
          <p className="text-2xl font-extrabold text-foreground mb-3">৳{totalBalance.toLocaleString("bn-BD")}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="income-zone border rounded-xl p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--income-bg)' }}>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--income-text-soft)' }} />
              </div>
              <div>
                <p className="text-[10px] font-medium" style={{ color: 'var(--income-text-soft)', opacity: 0.7 }}>আয়</p>
                <p className="text-xs font-bold" style={{ color: 'var(--income-text)' }}>৳{totalIncome.toLocaleString("bn-BD")}</p>
              </div>
            </div>
            <div className="expense-zone border rounded-xl p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--expense-bg)' }}>
                <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--expense-text-soft)' }} />
              </div>
              <div>
                <p className="text-[10px] font-medium" style={{ color: 'var(--expense-text-soft)', opacity: 0.7 }}>খরচ</p>
                <p className="text-xs font-bold" style={{ color: 'var(--expense-text)' }}>৳{totalExpense.toLocaleString("bn-BD")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Button
            onClick={() => openTxDialog("income")}
            className="gap-2 h-11 rounded-2xl font-semibold btn-press"
            variant="ghost"
            style={{ background: 'var(--action-btn-bg)', borderColor: 'var(--action-btn-border)', color: 'var(--income-text-soft)', border: '1px solid var(--action-btn-border)' }}
          >
            <ArrowUpRight className="w-4 h-4" /> আয় যোগ
          </Button>
          <Button
            onClick={() => openTxDialog("expense")}
            className="gap-2 h-11 rounded-2xl font-semibold btn-press"
            variant="ghost"
            style={{ background: 'var(--action-btn-bg)', borderColor: 'var(--action-btn-border)', color: 'var(--expense-text-soft)', border: '1px solid var(--action-btn-border)' }}
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
                  activeTab === tab.id ? "pill-tab-active" : ""
                }`}
                style={activeTab !== tab.id ? { color: 'var(--tab-inactive)' } : undefined}
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
            <MonthlyChart transactions={transactions ?? []} />
            <ExpensePieChart transactions={transactions as any ?? []} />
            <div className="premium-card p-3 flex items-center justify-between flex-wrap gap-2">
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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: tx.type === "income" ? 'var(--income-bg)' : 'var(--expense-bg)', color: tx.type === "income" ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}
                      >
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
                    <p className="text-sm font-bold" style={{ color: tx.type === "income" ? 'var(--income-text)' : 'var(--expense-text)' }}>
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

      {/* Add Transaction Bottom Sheet */}
      <BottomSheet open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{txType === "income" ? "আয় যোগ করুন" : "খরচ যোগ করুন"}</BottomSheetTitle>
            <BottomSheetDescription>
              {txType === "income" ? "আয়ের বিবরণ দিন" : "খরচের বিবরণ দিন"}
            </BottomSheetDescription>
          </BottomSheetHeader>
          <form onSubmit={handleAddTx} className="form-section-gap">
            {/* Amount - special highlighted */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">পরিমাণ (৳)</Label>
              <CalculatorInput value={txAmount} onChange={setTxAmount} placeholder="যেমন: 500 + 200" required className="form-input-amount" />
            </div>

            {/* Category + Account side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ক্যাটাগরি</Label>
                <Select value={txCategory} onValueChange={setTxCategory}>
                  <SelectTrigger className="form-input"><SelectValue placeholder="বাছুন" /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">অ্যাকাউন্ট</Label>
                <Select value={txAccount} onValueChange={setTxAccount}>
                  <SelectTrigger className="form-input"><SelectValue placeholder="বাছুন" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">তারিখ</Label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required className="form-input" />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">নোট (ঐচ্ছিক)</Label>
              <Input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="নোট লিখুন..." className="form-input" />
            </div>

            <Button type="submit" className="w-full h-12 rounded-2xl text-base btn-primary mt-2" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
            </Button>
          </form>
        </BottomSheetContent>
      </BottomSheet>

      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        transaction={editTx}
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        ledgerId={ledgerId!}
      />

      {/* Expandable FAB */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("income"); }}
              className="flex items-center gap-2 animate-fade-in"
              style={{ animationDuration: '0.15s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md">আয়</span>
              <div className="w-11 h-11 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </button>
            <button
              onClick={() => { setFabOpen(false); openTxDialog("expense"); }}
              className="flex items-center gap-2 animate-fade-in"
              style={{ animationDuration: '0.2s' }}
            >
              <span className="text-xs font-semibold text-foreground bg-popover/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md">খরচ</span>
              <div className="w-11 h-11 rounded-full bg-red-500 shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 rounded-full fab-button flex items-center justify-center text-white shadow-xl transition-transform duration-200"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default LedgerDetailPage;
