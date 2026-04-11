import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, LogOut, BookOpen, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

const LedgerListPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newLedgerName, setNewLedgerName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: ledgers, isLoading } = useQuery({
    queryKey: ["ledgers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledgers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ledgerBalances } = useQuery({
    queryKey: ["ledger-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("ledger_id, type, amount");
      if (error) throw error;
      const balances: Record<string, number> = {};
      data.forEach((t) => {
        if (!balances[t.ledger_id]) balances[t.ledger_id] = 0;
        balances[t.ledger_id] += t.type === "income" ? t.amount : -t.amount;
      });
      return balances;
    },
  });

  const createLedger = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("ledgers").insert({ name, user_id: user!.id }).select().single();
      if (error) throw error;
      const defaultAccounts = [
        { ledger_id: data.id, user_id: user!.id, name: "নগদ (Cash)", type: "cash" },
        { ledger_id: data.id, user_id: user!.id, name: "ব্যাংক (Bank)", type: "bank" },
        { ledger_id: data.id, user_id: user!.id, name: "মোবাইল ব্যাংকিং", type: "mobile_banking" },
      ];
      await supabase.from("accounts").insert(defaultAccounts);
      const defaultCategories = [
        { ledger_id: data.id, user_id: user!.id, name: "বেতন", type: "income" },
        { ledger_id: data.id, user_id: user!.id, name: "ব্যবসা", type: "income" },
        { ledger_id: data.id, user_id: user!.id, name: "অন্যান্য আয়", type: "income" },
        { ledger_id: data.id, user_id: user!.id, name: "খাবার", type: "expense" },
        { ledger_id: data.id, user_id: user!.id, name: "যাতায়াত", type: "expense" },
        { ledger_id: data.id, user_id: user!.id, name: "বিল", type: "expense" },
        { ledger_id: data.id, user_id: user!.id, name: "শপিং", type: "expense" },
        { ledger_id: data.id, user_id: user!.id, name: "বাজার", type: "expense" },
        { ledger_id: data.id, user_id: user!.id, name: "অন্যান্য খরচ", type: "expense" },
      ];
      await supabase.from("categories").insert(defaultCategories);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      setNewLedgerName("");
      setDialogOpen(false);
      toast.success("নতুন খাতা তৈরি হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLedger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ledgers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      setDeleteTarget(null);
      toast.success("খাতা মুছে ফেলা হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerName.trim()) createLedger.mutate(newLedgerName.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Dark Header */}
      <div className="gradient-header px-4 pt-4 pb-5">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">FinTrack</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">আমার খাতাসমূহ</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-xl gradient-primary shadow-md font-semibold text-xs h-8">
                <Plus className="w-3.5 h-3.5" /> নতুন খাতা
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-2xl bg-popover border-white/10">
              <DialogHeader><DialogTitle>নতুন খাতা তৈরি করুন</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="খাতার নাম লিখুন..."
                  required
                  className="rounded-xl"
                />
                <Button type="submit" className="w-full h-11 rounded-2xl gradient-primary shadow-md font-semibold" disabled={createLedger.isPending}>
                  {createLedger.isPending ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : ledgers?.length === 0 ? (
          <div className="premium-card p-10 text-center border-dashed">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">কোনো খাতা নেই</p>
            <p className="text-xs text-muted-foreground mt-1">নতুন খাতা তৈরি করে শুরু করুন</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ledgers?.map((ledger) => {
              const balance = ledgerBalances?.[ledger.id] ?? 0;
              return (
                <div key={ledger.id} className="premium-card p-3.5 group">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => navigate(`/ledger/${ledger.id}`)}
                    >
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{ledger.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ledger.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <p className="font-bold text-base" style={{ color: balance >= 0 ? 'var(--income-text)' : 'var(--expense-text)' }}>
                          ৳{balance.toLocaleString("bn-BD")}
                        </p>
                        <div className="flex items-center gap-0.5 justify-end">
                          {balance >= 0 ? (
                            <TrendingUp className="w-2.5 h-2.5" style={{ color: 'var(--income-text-soft)' }} />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" style={{ color: 'var(--expense-text-soft)' }} />
                          )}
                          <span className="text-[10px] text-muted-foreground">ব্যালেন্স</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ledger.id, name: ledger.name }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl bg-popover border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>"{deleteTarget?.name}" মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই হিসাব খাতা ও এর সব ডাটা মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteLedger.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {deleteLedger.isPending ? "মুছছে..." : "মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LedgerListPage;
