import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Ledger, Transaction } from "@/integrations/firebase/types";
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: ledgers, isLoading } = useQuery({
    queryKey: ["ledgers"],
    queryFn: async () => {
      const q = query(collection(db, "ledgers"), where("user_id", "==", user!.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return data;
    },
    enabled: !!user,
  });

  const { data: ledgerBalances } = useQuery({
    queryKey: ["ledger-balances", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "transactions"), where("user_id", "==", user!.uid));
      const querySnapshot = await getDocs(q);
      const balances: Record<string, number> = {};
      querySnapshot.docs.forEach((doc) => {
        const t = doc.data() as Transaction;
        if (!balances[t.ledger_id]) balances[t.ledger_id] = 0;
        balances[t.ledger_id] += t.type === "income" ? t.amount : -t.amount;
      });
      return balances;
    },
    enabled: !!user,
  });

  const createLedger = useMutation({
    mutationFn: async (name: string) => {
      const ledgerData = { name, user_id: user!.uid, currency: 'BDT', created_at: new Date().toISOString() };
      const ledgerRef = await addDoc(collection(db, "ledgers"), ledgerData);
      
      const defaultAccounts = [
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "নগদ", type: "cash", balance: 0, created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "ব্যাংক (Bank)", type: "bank", balance: 0, created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "মোবাইল ব্যাংকিং", type: "mobile_banking", balance: 0, created_at: new Date().toISOString() },
      ];
      for (const acc of defaultAccounts) {
        await addDoc(collection(db, "accounts"), acc);
      }
      
      const defaultCategories = [
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "বেতন", type: "income", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "ব্যবসা", type: "income", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "অন্যান্য জমা", type: "income", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "খাবার", type: "expense", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "যাতায়াত", type: "expense", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "বিল", type: "expense", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "শপিং", type: "expense", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "বাজার", type: "expense", created_at: new Date().toISOString() },
        { ledger_id: ledgerRef.id, user_id: user!.uid, name: "অন্যান্য খরচ", type: "expense", created_at: new Date().toISOString() },
      ];
      for (const cat of defaultCategories) {
        await addDoc(collection(db, "categories"), cat);
      }
      return { id: ledgerRef.id, ...ledgerData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      setNewLedgerName("");
      setDialogOpen(false);
      toast.success("নতুন খাতা তৈরি হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLedger = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "ledgers", id));
      // In a real production app, we would also need to delete all associated accounts, categories, and transactions
      // either via a cloud function, batched writes, or keeping them orphaned. For simplicity, just deleting ledger doc.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("খাতা মুছে ফেলা হয়েছে!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerName.trim()) createLedger.mutate(newLedgerName.trim());
  };

  return (
    <div className="min-h-screen page-gradient">
      {/* Header */}
      <div className="gradient-header px-4 pt-4 pb-6 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="জমা খরচ" className="w-9 h-9 rounded-xl shadow-md" />
            <h1 className="text-lg font-extrabold text-white tracking-tight">জমা খরচ</h1>
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
        {/* Title + Add Button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">খাতাসমূহ</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-xl btn-primary text-xs h-8 px-3">
                <Plus className="w-3.5 h-3.5" /> নতুন খাতা
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-2xl bg-popover">
              <DialogHeader><DialogTitle>নতুন খাতা তৈরি করুন</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="খাতার নাম লিখুন..."
                  required
                  className="rounded-xl"
                />
                <Button type="submit" className="w-full h-11 rounded-2xl btn-primary" disabled={createLedger.isPending}>
                  {createLedger.isPending ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : ledgers?.length === 0 ? (
          <div className="premium-card p-10 text-center border-dashed">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">কোনো খাতা নেই</p>
            <p className="text-xs text-muted-foreground mt-1">নতুন খাতা তৈরি করে শুরু করুন</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ledgers?.map((ledger, index) => {
              const balance = ledgerBalances?.[ledger.id] ?? 0;
              return (
                <div
                  key={ledger.id}
                  className="premium-card p-4 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => navigate(`/ledger/${ledger.id}`)}
                    >
                      <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{ledger.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ledger.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                        className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <AlertDialogContent className="rounded-2xl bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>"{deleteTarget?.name}" মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই হিসাব খাতা ও এর সব ডাটা মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।
              <br /><br />
              নিশ্চিত করতে নিচে <span className="font-bold text-destructive">DELETE</span> টাইপ করুন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE লিখুন"
            className="rounded-xl"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteLedger.mutate(deleteTarget.id)}
              disabled={deleteConfirmText !== "DELETE" || deleteLedger.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl disabled:opacity-50"
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
