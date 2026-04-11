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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import GroceryModule from "@/components/GroceryModule";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";

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

  const { data: ledger } = useQuery({
    queryKey: ["ledger", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledgers")
        .select("*")
        .eq("id", ledgerId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("ledger_id", ledgerId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("ledger_id", ledgerId!);
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
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalIncome = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalExpense = transactions?.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalBalance = totalIncome - totalExpense;

  const filteredCategories = categories?.filter((c) => c.type === txType) ?? [];

  const { data: reminders } = useGroceryReminders(ledgerId);

    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        ledger_id: ledgerId!,
        user_id: user!.id,
        account_id: txAccount,
        category_id: txCategory,
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
    addTransaction.mutate();
  };

  const openTxDialog = (type: "income" | "expense") => {
    setTxType(type);
    setTxCategory("");
    setTxDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-primary-foreground">{ledger?.name ?? "..."}</h1>
          </div>
          {/* Balance cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary-foreground/15 rounded-lg p-2.5 text-center backdrop-blur-sm">
              <p className="text-xs text-primary-foreground/70">ব্যালেন্স</p>
              <p className="text-sm font-bold text-primary-foreground">৳{totalBalance.toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-primary-foreground/15 rounded-lg p-2.5 text-center backdrop-blur-sm">
              <p className="text-xs text-primary-foreground/70">আয়</p>
              <p className="text-sm font-bold text-primary-foreground">৳{totalIncome.toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-primary-foreground/15 rounded-lg p-2.5 text-center backdrop-blur-sm">
              <p className="text-xs text-primary-foreground/70">খরচ</p>
              <p className="text-sm font-bold text-primary-foreground">৳{totalExpense.toLocaleString("bn-BD")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button onClick={() => openTxDialog("income")} variant="outline" className="gap-2 h-12 border-success/30 text-success hover:bg-success/10">
            <ArrowUpRight className="w-4 h-4" /> আয় যোগ করুন
          </Button>
          <Button onClick={() => openTxDialog("expense")} variant="outline" className="gap-2 h-12 border-destructive/30 text-destructive hover:bg-destructive/10">
            <ArrowDownRight className="w-4 h-4" /> খরচ যোগ করুন
          </Button>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList className="w-full">
            <TabsTrigger value="transactions" className="flex-1 text-xs">লেনদেন</TabsTrigger>
            <TabsTrigger value="grocery" className="flex-1 text-xs">বাজার</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 text-xs">অ্যাকাউন্ট</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 text-xs">ক্যাটাগরি</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4 space-y-2">
            {!transactions?.length ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  কোনো লেনদেন নেই। আয় বা খরচ যোগ করুন।
                </CardContent>
              </Card>
            ) : (
              transactions.map((tx) => (
                <Card key={tx.id} className="animate-fade-in">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                        {tx.type === "income" ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{(tx.categories as any)?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(tx.accounts as any)?.name} • {tx.date}
                        </p>
                        {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                      </div>
                    </div>
                    <p className={`font-semibold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>


          <TabsContent value="grocery" className="mt-4">
            <GroceryModule
              ledgerId={ledgerId!}
              accounts={accounts ?? []}
              categories={categories ?? []}
            />
          </TabsContent>

          <TabsContent value="accounts" className="mt-4 space-y-2">
            {accounts?.map((acc) => (
              <Card key={acc.id} className="animate-fade-in">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type.replace("_", " ")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="categories" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-success mb-2">আয়ের ক্যাটাগরি</h3>
              <div className="space-y-1">
                {categories?.filter((c) => c.type === "income").map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <p className="text-sm">{c.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-destructive mb-2">খরচের ক্যাটাগরি</h3>
              <div className="space-y-1">
                {categories?.filter((c) => c.type === "expense").map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <p className="text-sm">{c.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{txType === "income" ? "আয় যোগ করুন" : "খরচ যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-4">
            <div className="space-y-2">
              <Label>পরিমাণ (৳)</Label>
              <Input
                type="number"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>ক্যাটাগরি</Label>
              <Select value={txCategory} onValueChange={setTxCategory} required>
                <SelectTrigger><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>অ্যাকাউন্ট</Label>
              <Select value={txAccount} onValueChange={setTxAccount} required>
                <SelectTrigger><SelectValue placeholder="অ্যাকাউন্ট বাছুন" /></SelectTrigger>
                <SelectContent>
                  {accounts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>তারিখ</Label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>নোট (ঐচ্ছিক)</Label>
              <Input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="নোট লিখুন..." />
            </div>
            <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LedgerDetailPage;
