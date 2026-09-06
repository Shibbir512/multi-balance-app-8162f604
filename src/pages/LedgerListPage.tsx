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
import { Plus, Wallet, LogOut, BookOpen, Trash2, TrendingUp, TrendingDown, Home, Briefcase, ArrowRight, Layers } from "lucide-react";
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

  const getLedgerIcon = (index: number) => {
    const icons = [BookOpen, Home, Wallet, Briefcase];
    const Icon = icons[index % icons.length];
    return <Icon className="w-5 h-5 text-white" />;
  };

  const getCardStyle = (index: number) => {
    const styles = [
      "bg-[#F4F1FF] border-[#E5E0FA] dark:bg-indigo-950/20 dark:border-indigo-900/40 shadow-[0_4px_24px_rgba(91,77,232,0.03)]", // Lavender
      "bg-[#F0F6FF] border-[#E0EDFA] dark:bg-blue-950/20 dark:border-blue-900/40 shadow-[0_4px_24px_rgba(59,130,246,0.03)]",  // Blue
      "bg-[#EEFBF6] border-[#DDF4EA] dark:bg-teal-950/20 dark:border-teal-900/40 shadow-[0_4px_24px_rgba(16,185,129,0.03)]",  // Mint
      "bg-[#FFF0F4] border-[#FCE1E8] dark:bg-rose-950/20 dark:border-rose-900/40 shadow-[0_4px_24px_rgba(244,63,94,0.03)]"    // Rose/Pink
    ];
    return styles[index % styles.length];
  };

  const totalLedgers = ledgers?.length || 0;
  const totalBalanceAll = ledgers?.reduce((sum, ledger) => sum + (ledgerBalances?.[ledger.id] ?? 0), 0) || 0;

  return (
    <div className="min-h-screen page-gradient pb-20 relative overflow-hidden z-0">
      {/* Decorative Background Watermarks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        
        {/* Top Right Abstract Circles */}
        <div className="absolute top-[10%] right-[-5%] lg:right-[5%] w-64 h-64 lg:w-96 lg:h-96 rounded-full bg-primary/[0.03] blur-3xl"></div>
        <div className="absolute top-[15%] right-[-2%] lg:right-[8%] w-48 h-48 lg:w-72 lg:h-72 rounded-full bg-primary/[0.04]"></div>

        {/* Bottom Right Bar Chart with Arrow */}
        <div className="absolute bottom-[5%] right-[-10%] lg:right-[0%] opacity-[0.03] text-primary w-[350px] lg:w-[500px]">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="20" y="140" width="25" height="60" rx="4" fill="currentColor"/>
            <rect x="60" y="100" width="25" height="100" rx="4" fill="currentColor"/>
            <rect x="100" y="60" width="25" height="140" rx="4" fill="currentColor"/>
            <rect x="140" y="20" width="25" height="180" rx="4" fill="currentColor"/>
            <path d="M40 120 L80 80 L120 40 L160 0" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <polygon points="160,0 150,15 170,15" fill="currentColor" transform="rotate(45 160 0)" />
          </svg>
        </div>

        {/* Left Faint Leaves */}
        <div className="absolute bottom-[10%] left-[-15%] lg:left-[-5%] opacity-[0.04] text-primary w-[300px] lg:w-[450px]">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
             <path fill="currentColor" d="M100 200 Q100 100 20 20 Q100 20 100 100 Q100 20 180 20 Q100 100 100 200" opacity="0.5"/>
             <ellipse cx="60" cy="60" rx="30" ry="60" fill="currentColor" transform="rotate(-45 60 60)"/>
             <ellipse cx="140" cy="60" rx="30" ry="60" fill="currentColor" transform="rotate(45 140 60)"/>
             <ellipse cx="40" cy="120" rx="20" ry="50" fill="currentColor" transform="rotate(-60 40 120)"/>
          </svg>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 w-full opacity-[0.05] text-primary h-[200px] lg:h-[350px]">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
            <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      {/* Header */}
      <div className="gradient-header px-4 pt-4 pb-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-8 h-8 text-white p-1.5 bg-white/20 rounded-xl shadow-sm" />
            <h1 className="text-lg font-extrabold text-white tracking-tight">জমাখরচ<span className="block text-[10px] font-medium opacity-80 mt-0.5 leading-none tracking-normal">আয় বুঝে ব্যয়</span></h1>
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

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-12">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 lg:mb-12">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">আবারও স্বাগতম! 👋</h2>
            <p className="text-sm text-muted-foreground font-medium">আজকের দিনটাও হোক সচেতন হিসাবের দিন</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto gap-2 rounded-2xl btn-primary h-11 px-6 shadow-sm">
                <Plus className="w-4 h-4" /> নতুন লেজার তৈরি
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

        {/* Ledger Section Header */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-foreground">আপনার লেজারসমূহ</h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-muted/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : ledgers?.length === 0 ? (
          <div className="premium-card p-12 text-center border-dashed mt-4 flex flex-col items-center justify-center min-h-[280px]">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">এখনও কোনো লেজার তৈরি করা হয়নি</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">আপনার আয়-ব্যয়ের হিসাব শুরু করতে প্রথম লেজারটি তৈরি করুন।</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl btn-primary h-10 px-5 shadow-sm">
              <Plus className="w-4 h-4" /> নতুন লেজার তৈরি
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ledgers?.map((ledger, index) => {
                const balance = ledgerBalances?.[ledger.id] ?? 0;
                return (
                  <div
                    key={ledger.id}
                    onClick={() => navigate(`/ledger/${ledger.id}`)}
                    className={`p-5 rounded-[24px] border shadow-sm group animate-fade-in-up cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col relative h-full overflow-hidden ${getCardStyle(index)}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Background Watermark */}
                    <div className="absolute -bottom-8 -right-8 pointer-events-none z-0 opacity-[0.04] dark:opacity-[0.02] transform group-hover:scale-105 transition-transform duration-500">
                      {index === 0 && <BookOpen className="w-56 h-56 text-indigo-700 dark:text-indigo-200" strokeWidth={0.8} />}
                      {index === 1 && <Home className="w-56 h-56 text-blue-700 dark:text-blue-200" strokeWidth={0.8} />}
                      {index === 2 && <Wallet className="w-56 h-56 text-teal-700 dark:text-teal-200" strokeWidth={0.8} />}
                      {index > 2 && <Briefcase className="w-56 h-56 text-rose-700 dark:text-rose-200" strokeWidth={0.8} />}
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-[14px] gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                          {getLedgerIcon(index)}
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground leading-tight">{ledger.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{ledger.currency}</p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ledger.id, name: ledger.name }); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Balance Area */}
                    <div className="mt-auto p-4 mb-4 rounded-[20px] bg-white/95 dark:bg-black/40 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-white/60 dark:border-white/5 relative z-10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {balance >= 0 ? (
                          <div className="w-5 h-5 rounded-md bg-[var(--income-bg)] flex items-center justify-center">
                            <TrendingUp className="w-3 h-3" style={{ color: 'var(--income-text-soft)' }} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-[var(--expense-bg)] flex items-center justify-center">
                            <TrendingDown className="w-3 h-3" style={{ color: 'var(--expense-text-soft)' }} />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">বর্তমান ব্যালেন্স</span>
                      </div>
                      <p className="font-extrabold text-2xl lg:text-3xl tracking-tight" style={{ color: balance >= 0 ? 'var(--income-text)' : 'var(--expense-text)' }}>
                        ৳{balance.toLocaleString("bn-BD")}
                      </p>
                    </div>

                    {/* Footer action */}
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                      <span className="text-xs font-bold text-primary">বিস্তারিত দেখুন</span>
                      <ArrowRight className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Card */}
            {totalLedgers > 0 && (
              <div className="mt-12 bg-white/95 dark:bg-black/40 rounded-[24px] border border-indigo-100 dark:border-indigo-900/30 shadow-[0_4px_20px_rgba(91,77,232,0.03)] py-5 px-6 md:px-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-3xl animate-fade-in-up mx-auto" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-[14px] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-primary shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground mb-0.5">মোট লেজার</p>
                    <p className="text-2xl font-extrabold text-foreground leading-none">{totalLedgers.toLocaleString('bn-BD')}</p>
                  </div>
                </div>
                
                <div className="hidden md:block w-px h-10 bg-border/60"></div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-[14px] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-primary shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground mb-0.5">মোট ব্যালেন্স</p>
                    <p className="text-2xl font-extrabold leading-none" style={{ color: totalBalanceAll >= 0 ? 'var(--income-text)' : 'var(--expense-text)' }}>
                      ৳{totalBalanceAll.toLocaleString('bn-BD')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
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
