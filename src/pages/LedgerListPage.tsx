import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, LogOut, BookOpen, Trash2 } from "lucide-react";
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
      <div className="sticky top-0 z-10 bg-primary px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">FinTrack</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary/80">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">আমার খাতাসমূহ</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> নতুন খাতা</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>নতুন খাতা তৈরি করুন</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} placeholder="খাতার নাম লিখুন..." required />
                <Button type="submit" className="w-full" disabled={createLedger.isPending}>
                  {createLedger.isPending ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : ledgers?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">কোনো খাতা নেই</p>
              <p className="text-sm text-muted-foreground">নতুন খাতা তৈরি করে শুরু করুন</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {ledgers?.map((ledger) => {
              const balance = ledgerBalances?.[ledger.id] ?? 0;
              return (
                <Card key={ledger.id} className="animate-fade-in group">
                  <CardContent className="flex items-center justify-between p-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => navigate(`/ledger/${ledger.id}`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{ledger.name}</p>
                        <p className="text-xs text-muted-foreground">{ledger.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-lg ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                        ৳{balance.toLocaleString("bn-BD")}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ledger.id, name: ledger.name }); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>"{deleteTarget?.name}" মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই হিসাব খাতা ও এর সব ডাটা মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteLedger.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
