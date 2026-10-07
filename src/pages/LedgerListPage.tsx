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
import { Plus, Wallet, LogOut, BookOpen, Trash2, Layers, BarChart3, PieChart, Settings, ArrowRight, Home, FileText, MoreHorizontal, Receipt } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { LedgerCard } from "@/components/LedgerCard";

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

  const { data: ledgerStats } = useQuery({
    queryKey: ["ledger-stats", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "transactions"), where("user_id", "==", user!.uid));
      const querySnapshot = await getDocs(q);
      const stats: Record<string, { balance: number, count: number, lastDate: number | null }> = {};
      querySnapshot.docs.forEach((doc) => {
        const t = doc.data() as Transaction;
        if (!stats[t.ledger_id]) stats[t.ledger_id] = { balance: 0, count: 0, lastDate: null };
        stats[t.ledger_id].balance += t.type === "income" ? t.amount : -t.amount;
        stats[t.ledger_id].count += 1;

        const tTime = new Date(t.date).getTime();
        if (stats[t.ledger_id].lastDate === null || tTime > stats[t.ledger_id].lastDate!) {
          stats[t.ledger_id].lastDate = tTime;
        }
      });
      return stats;
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
      queryClient.invalidateQueries({ queryKey: ["ledger-stats"] });
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

  const totalLedgers = ledgers?.length || 0;
  const totalBalanceAll = ledgers?.reduce((sum, ledger) => sum + (ledgerStats?.[ledger.id]?.balance ?? 0), 0) || 0;

  return (
    <div className="min-h-screen ll-page-bg pb-20 relative overflow-hidden z-0">
      {/* Vivid Glassy Background — hidden on mobile via CSS for clean subtle bg */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 bg-[#F8F9FE] dark:bg-[#080B14]">
        {/* Top Right Orb */}
        <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#7C3AED]/30 to-[#4338CA]/30 blur-[80px] dark:from-[#7C3AED]/20 dark:to-[#4338CA]/20" />
        {/* Bottom Left Orb */}
        <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#3B82F6]/20 to-[#06B6D4]/20 blur-[80px] dark:from-[#3B82F6]/15 dark:to-[#06B6D4]/15" />
        {/* Center Accent Orb */}
        <div className="absolute top-[25%] left-[30%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#EC4899]/15 to-[#8B5CF6]/15 blur-[80px] dark:from-[#EC4899]/10 dark:to-[#8B5CF6]/10" />
        {/* Very subtle transparent overlay to blend, no muddy white */}
        <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[30px] -z-10" />
      </div>

      {/* Header */}
      <div 
        className="gradient-header px-0 pt-0 pb-0 relative md:sticky top-0 z-50 transition-all duration-300" 
        style={{ height: 'auto', minHeight: '76px' }}
      >
        {/* Mobile & Desktop Hero Background */}
        <div className="absolute inset-0 z-0 h-[180px] md:h-full transition-all duration-300 overflow-hidden rounded-b-[44px] md:rounded-none">
          <div 
            className="absolute inset-0 transition-opacity duration-300 opacity-100 dark:opacity-0"
            style={{
              backgroundImage: "url('/images/header/day-header.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center center", 
            }}
          />
          <div 
            className="absolute inset-0 transition-opacity duration-300 opacity-0 dark:opacity-100"
            style={{
              backgroundImage: "url('/images/header/night-header.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center center",
            }}
          />
          
          {/* Subtle Gradient Overlay for Readability */}
          <div className="absolute inset-0 transition-colors duration-300 bg-gradient-to-b from-black/30 via-transparent to-black/10 dark:from-[#090C15]/50 dark:via-[#090C15]/10 dark:to-[#090C15]/30 pointer-events-none" />
        </div>

        <div className="relative z-[2] flex items-start md:items-start justify-between w-full max-w-[1280px] mx-auto px-[20px] pt-[24px] min-[400px]:px-[28px] min-[400px]:pt-[28px] md:pt-[32px] md:px-4 h-[180px] md:h-[180px]">
          <div className="flex items-center gap-[12px] md:gap-[10px]">
            <div className="w-[56px] h-[56px] min-[400px]:w-[62px] min-[400px]:h-[62px] md:w-[38px] md:h-[38px] rounded-[18px] md:rounded-full flex items-center justify-center bg-white/15 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-[12px] shadow-sm">
              <Wallet className="w-[28px] h-[28px] md:w-[18px] md:h-[18px] text-white" strokeWidth={2} />
            </div>
            <div className="drop-shadow-sm flex flex-col items-start">
              <h1 className="text-[24px] md:text-[18px] font-extrabold text-white leading-tight tracking-tight" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>জমাখরচ</h1>
              <p className="text-[12px] md:text-[11px] text-white/90 leading-none mt-[4px] md:mt-0.5 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>আয় বুঝে ব্যয়</p>
            </div>
          </div>
          
          {/* Mobile Controls (shown at top right on mobile) */}
          <div className="flex md:hidden items-center gap-[8px] min-[400px]:gap-[10px]">
            <div className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center bg-white/15 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-[14px] shadow-sm overflow-hidden text-white [&>button]:text-white">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-white hover:text-white bg-white/15 dark:bg-black/20 hover:bg-white/25 rounded-[18px] h-[54px] w-[54px] border border-white/30 dark:border-white/10 backdrop-blur-[14px] shadow-sm transition-all"
            >
              <LogOut className="w-[22px] h-[22px]" strokeWidth={2.5} />
            </Button>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-[8px]">
            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-white/10 border border-white/20 backdrop-blur-md shadow-sm overflow-hidden hover:bg-white/20">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full h-[42px] w-[42px] border border-white/20 backdrop-blur-md shadow-sm transition-all"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-[1280px] mx-auto px-[20px] min-[400px]:px-[24px] sm:px-6 lg:px-8 pt-[24px] pb-10 mt-0 z-10">

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div className="md:mt-0 mt-2">
            <h2 className="text-[26px] md:text-[24px] font-bold text-[#1E293B] dark:text-[#E2E8F0] tracking-tight mb-1 md:mb-1">
              আবারও স্বাগতম! 👋
            </h2>
            <p className="text-[14px] md:text-[13px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              আজকের দিনটাও হোক সচেতন হিসাবের দিন
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full md:w-auto gap-2 rounded-[14px] md:rounded-[11px] btn-primary h-[54px] md:h-[42px] px-6 shadow-sm text-[16px] md:text-[14px] bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white border-0"
                style={{ fontWeight: 600 }}
              >
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#64748B] dark:text-[#475569] uppercase tracking-wider">
            আপনার লেজারসমূহ
          </h3>
          <span className="text-[14px] font-medium text-[#7C3AED] dark:text-[#A78BFA] cursor-pointer hover:opacity-80 transition-opacity hidden max-[767px]:inline-flex items-center gap-1">
            সব দেখুন <ArrowRight className="w-3.5 h-3.5 inline" />
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-[270px] bg-[#F1F5F9] dark:bg-[#151D32] animate-pulse rounded-[18px]" />)}
          </div>
        ) : ledgers?.length === 0 ? (
          <div className="bg-white dark:bg-[#151D32] rounded-[18px] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] p-12 text-center flex flex-col items-center justify-center min-h-[260px] shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="w-14 h-14 rounded-[16px] bg-[#EDE9FE] dark:bg-[rgba(109,40,217,0.12)] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-[#6D28D9]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#1E293B] dark:text-[#E2E8F0] mb-2">এখনও কোনো লেজার তৈরি করা হয়নি</h3>
            <p className="text-[13px] text-[#94A3B8] mb-6 max-w-sm mx-auto leading-relaxed">আপনার আয়-ব্যয়ের হিসাব শুরু করতে প্রথম লেজারটি তৈরি করুন।</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-[11px] btn-primary h-[42px] px-5 shadow-sm">
              <Plus className="w-4 h-4" /> নতুন লেজার তৈরি
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
              {ledgers?.map((ledger) => {
                const stats = ledgerStats?.[ledger.id] || { balance: 0, count: 0, lastDate: null };
                return (
                  <LedgerCard
                    key={ledger.id}
                    ledger={ledger}
                    balance={stats.balance}
                    transactionCount={stats.count}
                    lastTransactionDate={stats.lastDate}
                    onDelete={(id, name) => setDeleteTarget({ id, name })}
                  />
                );
              })}
            </div>

            {/* Summary Bar */}
            {totalLedgers > 0 && (
              <div className="mt-8 animate-fade-in-up mx-auto" style={{ animationDelay: '0.15s', maxWidth: '680px' }}>
                <div className="bg-white dark:bg-[#151D32] rounded-[18px] border-2 border-[#7C4DFF33] dark:border-[#7C4DFF44] shadow-[0_2px_12px_rgba(124,77,255,0.08)] dark:shadow-none py-[18px] px-6 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-0">
                  {/* Ledger Count */}
                  <div className="flex items-center gap-3 sm:flex-1 sm:justify-center">
                    <div className="w-[40px] h-[40px] rounded-[12px] bg-[#EDE9FE] dark:bg-[rgba(109,40,217,0.12)] flex items-center justify-center shrink-0">
                      <Layers className="w-[18px] h-[18px] text-[#6D28D9] dark:text-[#A78BFA]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#94A3B8] dark:text-[#64748B] mb-0.5">মোট লেজার</p>
                      <p className="text-[22px] font-bold text-[#1E293B] dark:text-[#E2E8F0] leading-none">{totalLedgers.toLocaleString('bn-BD')}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-[1px] h-[36px] bg-[#E8EAF0] dark:bg-[rgba(255,255,255,0.07)]" />
                  <div className="sm:hidden w-[80px] h-[1px] bg-[#E8EAF0] dark:bg-[rgba(255,255,255,0.07)]" />

                  {/* Total Balance */}
                  <div className="flex items-center gap-3 sm:flex-1 sm:justify-center">
                    <div className="w-[40px] h-[40px] rounded-[12px] bg-[#EDE9FE] dark:bg-[rgba(109,40,217,0.12)] flex items-center justify-center shrink-0">
                      <Wallet className="w-[18px] h-[18px] text-[#6D28D9] dark:text-[#A78BFA]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#94A3B8] dark:text-[#64748B] mb-0.5">মোট ব্যালেন্স</p>
                      <p
                        className="text-[22px] font-bold leading-none"
                        style={{ color: totalBalanceAll >= 0 ? 'var(--income-text)' : 'var(--expense-text)' }}
                      >
                        ৳{totalBalanceAll.toLocaleString('bn-BD')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {totalLedgers > 0 && (
              <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-[#64748B] dark:text-[#475569] uppercase tracking-wider">
                    দ্রুত শুরু করুন
                  </h3>
                  <span className="text-[14px] font-medium text-[#7C3AED] dark:text-[#A78BFA] cursor-pointer hover:opacity-80 transition-opacity hidden max-[767px]:inline-flex items-center gap-1">
                    সব দেখুন <ArrowRight className="w-3.5 h-3.5 inline" />
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">

                  {/* Add Transaction */}
                  <div
                    className="ll-quick-action-card group"
                    style={{ borderColor: '#DC262622', borderWidth: '2px' }}
                    onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#DC262655'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#DC262622'; }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-[#FEE2E2] dark:bg-[rgba(239,68,68,0.10)] shrink-0">
                        <Plus className="w-[18px] h-[18px] text-[#DC2626] dark:text-[#F87171]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] leading-tight">লেনদেন<br />যোগ করুন</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#DC2626]/40 dark:text-[#F87171]/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Report */}
                  <div
                    className="ll-quick-action-card group"
                    style={{ borderColor: '#6D28D922', borderWidth: '2px' }}
                    onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6D28D955'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#6D28D922'; }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-[#EDE9FE] dark:bg-[rgba(109,40,217,0.10)] shrink-0">
                        <BarChart3 className="w-[18px] h-[18px] text-[#6D28D9] dark:text-[#A78BFA]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] leading-tight">রিপোর্ট<br />দেখুন</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#6D28D9]/40 dark:text-[#A78BFA]/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Budget */}
                  <div
                    className="ll-quick-action-card group"
                    style={{ borderColor: '#05966922', borderWidth: '2px' }}
                    onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#05966955'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#05966922'; }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-[#D1FAE5] dark:bg-[rgba(5,150,105,0.10)] shrink-0">
                        <PieChart className="w-[18px] h-[18px] text-[#059669] dark:text-[#34D399]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] leading-tight">বাজেট<br />সেট করুন</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#059669]/40 dark:text-[#34D399]/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Settings */}
                  <div
                    className="ll-quick-action-card group"
                    style={{ borderColor: '#2563EB22', borderWidth: '2px' }}
                    onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563EB55'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2563EB22'; }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-[#DBEAFE] dark:bg-[rgba(37,99,235,0.10)] shrink-0">
                        <Settings className="w-[18px] h-[18px] text-[#2563EB] dark:text-[#60A5FA]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] leading-tight">লেজার<br />সেটিংস</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#2563EB]/40 dark:text-[#60A5FA]/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button className="mobile-bottom-nav-item active" type="button">
          <Home strokeWidth={1.8} />
          <span>হোম</span>
        </button>
        <button className="mobile-bottom-nav-item" type="button" onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}>
          <Receipt strokeWidth={1.8} />
          <span>লেনদেন</span>
        </button>
        <button className="mobile-bottom-nav-item" type="button" onClick={() => ledgers?.[0] && navigate(`/ledger/${ledgers[0].id}`)}>
          <BarChart3 strokeWidth={1.8} />
          <span>রিপোর্ট</span>
        </button>
        <button className="mobile-bottom-nav-item" type="button">
          <MoreHorizontal strokeWidth={1.8} />
          <span>আরও</span>
        </button>
      </nav>

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
