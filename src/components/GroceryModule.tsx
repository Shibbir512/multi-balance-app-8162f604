import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Plus, ShoppingCart, Package, Minus, Check, ArrowRight, ArrowLeft, Pencil, Trash2, Clock, Sparkles, CheckCircle2, Circle, Download, ListChecks, History, Wallet, Receipt, Search, X
} from "lucide-react";

const SectionLabel = ({ icon: Icon, label, accent }: { icon: any; label: string; accent?: string }) => (
  <div className="flex items-center gap-1.5 mb-2 px-0.5">
    <Icon className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} style={accent ? { color: accent } : undefined} />
    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">{label}</span>
    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
  </div>
);

const getAccountEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("মোবাইল") || n.includes("বিকাশ") || n.includes("নগদ")) return "📱";
  if (n.includes("cash") || n.includes("নগদ") || n.includes("হাত")) return "💵";
  if (n.includes("bank") || n.includes("ব্যাংক")) return "🏦";
  if (n.includes("card") || n.includes("কার্ড")) return "💳";
  return "💰";
};
import { toast } from "sonner";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";
import CalculatorInput from "@/components/CalculatorInput";

interface ShoppingItem {
  masterId: string | null;
  name: string;
  unit: string;
  quantity: number;
  selected: boolean;
  pricePerUnit: number;
  directTotal: number;
  useDirectTotal: boolean;
}

type GroceryStep = "master" | "shopping" | "pricing";

interface GroceryModuleProps {
  ledgerId: string;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
}

const UNITS = ["কেজি", "লিটার", "পিস", "প্যাকেট", "হালি", "ডজন"];

const GroceryModule = ({ ledgerId, accounts, categories }: GroceryModuleProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<GroceryStep>("master");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("কেজি");
  const [newQty, setNewQty] = useState("1");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSourceLedger, setImportSourceLedger] = useState<string>("");
  const [importSelectedItems, setImportSelectedItems] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: masterItems, isLoading } = useQuery({
    queryKey: ["grocery-master", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grocery_master_items").select("*").eq("ledger_id", ledgerId).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reminders } = useGroceryReminders(ledgerId);

  const { data: batches } = useQuery({
    queryKey: ["grocery-batches", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grocery_batches").select("*").eq("ledger_id", ledgerId).eq("status", "completed").order("batch_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentItems } = useQuery({
    queryKey: ["grocery-recent-items", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_batch_items")
        .select("name, unit, quantity, price_per_unit, batch_id, grocery_batches!inner(ledger_id)")
        .eq("grocery_batches.ledger_id", ledgerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      }).slice(0, 8);
    },
  });

  // Fetch all ledgers for import
  const { data: allLedgers } = useQuery({
    queryKey: ["ledgers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledgers").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const otherLedgers = useMemo(() => allLedgers?.filter(l => l.id !== ledgerId) ?? [], [allLedgers, ledgerId]);

  // Fetch master items from selected source ledger
  const { data: importSourceItems } = useQuery({
    queryKey: ["grocery-master-import", importSourceLedger],
    enabled: !!importSourceLedger,
    queryFn: async () => {
      const { data, error } = await supabase.from("grocery_master_items").select("*").eq("ledger_id", importSourceLedger).order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleImport = async () => {
    if (!importSourceItems || importSelectedItems.size === 0) return;
    setImportLoading(true);
    try {
      const itemsToImport = importSourceItems.filter(i => importSelectedItems.has(i.id));
      const existingNames = new Set(masterItems?.map(i => i.name.toLowerCase()) ?? []);
      const newItems = itemsToImport.filter(i => !existingNames.has(i.name.toLowerCase()));
      if (newItems.length === 0) {
        toast.info("সব আইটেম আগে থেকেই এই লেজারে আছে");
        return;
      }
      const { error } = await supabase.from("grocery_master_items").insert(
        newItems.map(item => ({
          ledger_id: ledgerId, user_id: user!.id, name: item.name, unit: item.unit, default_quantity: item.default_quantity,
        }))
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      toast.success(`${newItems.length}টি আইটেম আমদানি হয়েছে!`);
      setImportOpen(false); setImportSourceLedger(""); setImportSelectedItems(new Set());
    } catch (e: any) { toast.error(e.message); }
    finally { setImportLoading(false); }
  };

  // Auto-suggest items based on purchase frequency
  const suggestedItems = useMemo(() => {
    if (!masterItems) return [];
    const today = new Date();
    return masterItems
      .filter((item) => {
        if (!item.average_interval || !item.last_purchase_date) return false;
        const lastPurchase = new Date(item.last_purchase_date);
        const daysSince = Math.floor((today.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        // Suggest if days since last purchase >= 80% of average interval
        return daysSince >= item.average_interval * 0.8;
      })
      .sort((a, b) => {
        const daysA = Math.floor((today.getTime() - new Date(a.last_purchase_date!).getTime()) / (1000 * 60 * 60 * 24));
        const daysB = Math.floor((today.getTime() - new Date(b.last_purchase_date!).getTime()) / (1000 * 60 * 60 * 24));
        const ratioA = daysA / (a.average_interval || 1);
        const ratioB = daysB / (b.average_interval || 1);
        return ratioB - ratioA; // Most overdue first
      })
      .slice(0, 6);
  }, [masterItems]);

  // Split master items into remaining and completed
  const remainingItems = useMemo(() => masterItems?.filter((i) => !checkedItems.has(i.id)) ?? [], [masterItems, checkedItems]);
  const completedItems = useMemo(() => masterItems?.filter((i) => checkedItems.has(i.id)) ?? [], [masterItems, checkedItems]);

  const toggleChecked = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMasterItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grocery_master_items").insert({
        ledger_id: ledgerId, user_id: user!.id, name: newName.trim(), unit: newUnit, default_quantity: parseFloat(newQty) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      setNewName(""); setNewQty("1"); setAddItemOpen(false);
      toast.success("আইটেম যোগ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMasterItem = useMutation({
    mutationFn: async (item: { id: string; name: string; unit: string; default_quantity: number }) => {
      const { error } = await supabase.from("grocery_master_items").update({
        name: item.name, unit: item.unit, default_quantity: item.default_quantity,
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      setEditItem(null);
      toast.success("আইটেম আপডেট হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMasterItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grocery_master_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      setDeleteItemId(null);
      toast.success("আইটেম মুছে ফেলা হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startShopping = () => {
    const items: ShoppingItem[] = (masterItems ?? []).map((item) => ({
      masterId: item.id, name: item.name, unit: item.unit, quantity: item.default_quantity,
      selected: false, pricePerUnit: 0, directTotal: 0, useDirectTotal: false,
    }));
    setShoppingItems(items);
    setStep("shopping");
  };

  const addRecentItemToShopping = (item: any) => {
    const exists = shoppingItems.some((si) => si.name === item.name);
    if (exists) { toast.info("এই আইটেম আগে থেকেই আছে"); return; }
    setShoppingItems((prev) => [...prev, {
      masterId: null, name: item.name, unit: item.unit, quantity: item.quantity,
      selected: true, pricePerUnit: item.price_per_unit, directTotal: 0, useDirectTotal: false,
    }]);
    toast.success(`${item.name} যোগ হয়েছে`);
  };

  const toggleItem = (index: number) => {
    setShoppingItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const adjustQty = (index: number, delta: number) => {
    setShoppingItems((prev) => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(0.5, item.quantity + delta) } : item));
  };

  const setPrice = (index: number, price: string) => {
    setShoppingItems((prev) => prev.map((item, i) => i === index ? { ...item, pricePerUnit: parseFloat(price) || 0 } : item));
  };

  const setDirectTotalPrice = (index: number, total: string) => {
    const totalVal = parseFloat(total) || 0;
    setShoppingItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const ppu = item.quantity > 0 ? totalVal / item.quantity : 0;
      return { ...item, directTotal: totalVal, pricePerUnit: ppu };
    }));
  };

  const togglePriceMode = (index: number) => {
    setShoppingItems((prev) => prev.map((item, i) => i === index ? { ...item, useDirectTotal: !item.useDirectTotal } : item));
  };

  const addInlineItem = () => {
    if (!newName.trim()) return;
    setShoppingItems((prev) => [...prev, {
      masterId: null, name: newName.trim(), unit: newUnit, quantity: parseFloat(newQty) || 1,
      selected: true, pricePerUnit: 0, directTotal: 0, useDirectTotal: false,
    }]);
    setNewName(""); setNewQty("1");
  };

  const selectedItems = shoppingItems.filter((item) => item.selected);
  const grandTotal = selectedItems.reduce((sum, item) => {
    return sum + (item.useDirectTotal ? item.directTotal : item.quantity * item.pricePerUnit);
  }, 0);

  const groceryCategory = categories.find(
    (c) => c.type === "expense" && (c.name.includes("খাবার") || c.name.includes("বাজার") || c.name.includes("grocery"))
  );

  const saveBatch = async () => {
    if (!selectedAccount || grandTotal <= 0) {
      toast.error("অ্যাকাউন্ট বাছুন এবং দাম দিন"); return;
    }
    setSaving(true);
    try {
      const categoryId = groceryCategory?.id ?? categories.find((c) => c.type === "expense")?.id;
      const itemNames = selectedItems.map((i) => i.name).join(", ");
      const noteText = itemNames.length > 120 ? itemNames.slice(0, 117) + "..." : itemNames;
      const { data: tx, error: txError } = await supabase.from("transactions").insert({
        ledger_id: ledgerId, user_id: user!.id, account_id: selectedAccount,
        category_id: categoryId || null, type: "expense", amount: grandTotal,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        note: noteText,
      }).select().single();
      if (txError) throw txError;

      const { data: batch, error: batchError } = await supabase.from("grocery_batches").insert({
        ledger_id: ledgerId, user_id: user!.id, total_amount: grandTotal, transaction_id: tx.id, status: "completed",
      }).select().single();
      if (batchError) throw batchError;

      const batchItems = selectedItems.map((item) => ({
        batch_id: batch.id, user_id: user!.id, master_item_id: item.masterId, name: item.name,
        unit: item.unit, quantity: item.quantity, price_per_unit: item.pricePerUnit,
        subtotal: item.useDirectTotal ? item.directTotal : item.quantity * item.pricePerUnit,
      }));
      const { error: itemsError } = await supabase.from("grocery_batch_items").insert(batchItems);
      if (itemsError) throw itemsError;

      const masterIds = selectedItems.filter((i) => i.masterId).map((i) => i.masterId!);
      if (masterIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { data: currentMasters } = await supabase.from("grocery_master_items").select("id, last_purchase_date, average_interval").in("id", masterIds);
        if (currentMasters) {
          for (const master of currentMasters) {
            let newInterval = master.average_interval;
            if (master.last_purchase_date) {
              const daysBetween = Math.floor((new Date(today).getTime() - new Date(master.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24));
              if (daysBetween > 0) {
                const oldInterval = master.average_interval ?? daysBetween;
                newInterval = Math.round(oldInterval * 0.7 + daysBetween * 0.3);
              }
            }
            await supabase.from("grocery_master_items").update({ last_purchase_date: today, average_interval: newInterval }).eq("id", master.id);
          }
        }
      }

      const newItems = selectedItems.filter((i) => !i.masterId);
      if (newItems.length > 0) {
        await supabase.from("grocery_master_items").insert(
          newItems.map((item) => ({ ledger_id: ledgerId, user_id: user!.id, name: item.name, unit: item.unit, default_quantity: item.quantity, last_purchase_date: new Date().toISOString().split("T")[0] }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["grocery-batches", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["grocery-recent-items", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      queryClient.invalidateQueries({ queryKey: ["grocery-reminders", ledgerId] });

      toast.success(`বাজার সেভ হয়েছে! মোট: ৳${grandTotal.toLocaleString("bn-BD")}`);
      setStep("master"); setShoppingItems([]); setSelectedAccount("");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const renderMasterItem = (item: any, isCompleted: boolean) => (
    <div
      key={item.id}
      className={`premium-card p-3.5 group transition-all duration-300 ${isCompleted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleChecked(item.id)}
            className="shrink-0 transition-all duration-200"
          >
            {isCompleted ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--grocery-check-bg)' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--grocery-check-color)' }} />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                <Circle className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </button>
          <div>
            <p className={`text-sm font-semibold transition-all duration-200 ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.default_quantity} {item.unit}
              {item.last_purchase_date && ` • শেষ কেনা: ${item.last_purchase_date}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => { setEditItem(item); setNewName(item.name); setNewUnit(item.unit); setNewQty(item.default_quantity.toString()); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
            onClick={() => setDeleteItemId(item.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // === MASTER LIST VIEW ===
  if (step === "master") {
    return (
      <div className="space-y-5">
        {/* Premium Header with accent halo */}
        <div className="relative overflow-hidden rounded-2xl premium-card p-4">
          <div
            className="absolute -top-16 -right-12 w-44 h-44 rounded-full opacity-40 blur-3xl pointer-events-none"
            style={{ background: 'var(--gradient-primary)' }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight">বাজার তালিকা</h3>
                <p className="text-[10px] text-muted-foreground">{masterItems?.length ?? 0}টি আইটেম</p>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {otherLedgers.length > 0 && (
                <Button size="icon" variant="outline" onClick={() => setImportOpen(true)} className="h-9 w-9 rounded-xl">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="icon" variant="outline" onClick={() => setAddItemOpen(true)} className="h-9 w-9 rounded-xl">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" onClick={startShopping} disabled={!masterItems?.length} className="gap-1 h-9 rounded-xl gradient-primary shadow-sm font-semibold text-xs px-3">
                <ShoppingCart className="w-3.5 h-3.5" /> শুরু
              </Button>
            </div>
          </div>
        </div>

        {reminders && reminders.length > 0 && <GroceryReminders reminders={reminders} />}

        {/* Auto-suggested items */}
        {suggestedItems.length > 0 && (
          <div className="premium-card p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--income-bg)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--income-text-soft)' }} />
              </div>
              <div>
                <p className="text-xs font-bold">কেনার সময় হয়েছে</p>
                <p className="text-[10px] text-muted-foreground">পূর্ববর্তী কেনাকাটার ভিত্তিতে</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedItems.map((item) => {
                const daysSince = Math.floor((new Date().getTime() - new Date(item.last_purchase_date!).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecked(item.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      checkedItems.has(item.id)
                        ? "opacity-50 line-through"
                        : "hover:scale-105"
                    }`}
                    style={{ background: 'var(--expense-bg)', color: 'var(--expense-text-soft)' }}
                  >
                    {item.name}
                    <span className="text-[10px] opacity-70">{daysSince}দিন</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>
        ) : !masterItems?.length ? (
          <div className="premium-card p-10 text-center border-dashed">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">কোনো আইটেম নেই</p>
            <p className="text-xs text-muted-foreground mt-1">আইটেম যোগ করুন</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            {masterItems.length > 0 && checkedItems.size > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{checkedItems.size}/{masterItems.length} সম্পন্ন</span>
                  <span>{Math.round((checkedItems.size / masterItems.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(checkedItems.size / masterItems.length) * 100}%`,
                      background: 'var(--gradient-primary)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Remaining items */}
            {remainingItems.length > 0 && (
              <div className="space-y-2">
                <SectionLabel icon={ListChecks} label={`বাকি আইটেম (${remainingItems.length})`} />
                {remainingItems.map((item) => renderMasterItem(item, false))}
              </div>
            )}

            {/* Completed items */}
            {completedItems.length > 0 && (
              <div className="space-y-2">
                <SectionLabel icon={CheckCircle2} label={`সম্পন্ন (${completedItems.length})`} accent="var(--grocery-check-color)" />
                {completedItems.map((item) => renderMasterItem(item, true))}
              </div>
            )}
          </>
        )}

        {/* Recent items quick access */}
        {recentItems && recentItems.length > 0 && (
          <div className="mt-5">
            <SectionLabel icon={Clock} label="সাম্প্রতিক বাজার আইটেম" />
            <div className="flex flex-wrap gap-1.5">
              {recentItems.map((item, i) => (
                <button key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-accent transition-all hover:scale-105"
                  onClick={() => {
                    if (!masterItems?.some((m) => m.name === item.name)) {
                      supabase.from("grocery_master_items").insert({
                        ledger_id: ledgerId, user_id: user!.id, name: item.name, unit: item.unit, default_quantity: item.quantity,
                      }).then(() => queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] }));
                      toast.success(`${item.name} মাস্টার লিস্টে যোগ হয়েছে`);
                    } else {
                      toast.info("এই আইটেম আগে থেকেই মাস্টার লিস্টে আছে");
                    }
                  }}>
                  <Plus className="w-3 h-3 opacity-60" /> {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent batches */}
        {batches && batches.length > 0 && (
          <div className="mt-5">
            <SectionLabel icon={History} label="সাম্প্রতিক বাজার" />
            <div className="space-y-2">
              {batches.map((b) => (
                <div key={b.id} className="premium-card p-3.5 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{b.batch_date}</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--expense-text)' }}>৳{b.total_amount.toLocaleString("bn-BD")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Item Dialog */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent className="max-w-sm rounded-3xl overflow-hidden p-0 border-0">
            {/* Decorative gradient halo */}
            <div
              className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
            />
            {/* Premium header band */}
            <div
              className="relative flex items-center gap-3 px-5 pt-5 pb-4 border-b"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 6px 16px -4px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <DialogTitle className="text-base font-extrabold leading-tight">নতুন আইটেম যোগ করুন</DialogTitle>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">মাস্টার লিস্টে নতুন পণ্য যোগ করুন</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addMasterItem.mutate(); }} className="relative space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="যেমন: চাল, তেল, ডাল..." required className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" className="rounded-xl h-11" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary shadow-md font-bold gap-2 mt-1" disabled={addMasterItem.isPending}>
                <Plus className="w-4 h-4" />
                {addMasterItem.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent className="max-w-sm rounded-3xl overflow-hidden p-0 border-0">
            <div
              className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
            />
            <div
              className="relative flex items-center gap-3 px-5 pt-5 pb-4 border-b"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 6px 16px -4px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <DialogTitle className="text-base font-extrabold leading-tight">আইটেম সম্পাদনা</DialogTitle>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">পণ্যের তথ্য আপডেট করুন</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (editItem) updateMasterItem.mutate({ id: editItem.id, name: newName.trim(), unit: newUnit, default_quantity: parseFloat(newQty) || 1 });
            }} className="relative space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" className="rounded-xl h-11" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary shadow-md font-bold gap-2 mt-1" disabled={updateMasterItem.isPending}>
                <Check className="w-4 h-4" />
                {updateMasterItem.isPending ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
          <AlertDialogContent className="max-w-sm rounded-3xl overflow-hidden p-0 border-0">
            {/* Decorative red halo */}
            <div
              className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, #EF4444, transparent 70%)' }}
            />
            {/* Premium header band */}
            <div
              className="relative flex items-center gap-3 px-5 pt-5 pb-4 border-b"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.02))',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: '0 6px 16px -4px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <AlertDialogTitle className="text-base font-extrabold leading-tight">আইটেম মুছে ফেলবেন?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  এই আইটেম মাস্টার লিস্ট থেকে মুছে যাবে
                </AlertDialogDescription>
              </div>
            </div>

            <AlertDialogFooter className="relative px-5 py-4 gap-2 sm:gap-2 flex-row">
              <AlertDialogCancel className="flex-1 m-0 h-12 rounded-2xl font-bold border">
                বাতিল
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteItemId && deleteMasterItem.mutate(deleteItemId)}
                className="flex-1 m-0 h-12 rounded-2xl font-bold gap-2 text-white border-0"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: '0 6px 16px -4px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Trash2 className="w-4 h-4" />
                মুছুন
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import from another ledger Dialog */}
        <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setImportSourceLedger(""); setImportSelectedItems(new Set()); } else setImportOpen(true); }}>
          <DialogContent className="max-w-sm rounded-3xl overflow-hidden p-0 border-0 max-h-[85vh] flex flex-col">
            {/* Decorative gradient halo */}
            <div
              className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
            />
            {/* Premium header band */}
            <div
              className="relative flex items-center gap-3 px-5 pt-5 pb-4 border-b shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 6px 16px -4px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <DialogTitle className="text-base font-extrabold leading-tight">অন্য লেজার থেকে আমদানি</DialogTitle>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">পুরোনো বাজার লিস্ট কপি করুন</p>
              </div>
            </div>

            <div className="relative space-y-4 px-5 py-5 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">লেজার নির্বাচন করুন</Label>
                <Select value={importSourceLedger} onValueChange={(v) => { setImportSourceLedger(v); setImportSelectedItems(new Set()); }}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="লেজার বেছে নিন" /></SelectTrigger>
                  <SelectContent>
                    {otherLedgers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {importSourceLedger && importSourceItems && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      আইটেম
                      <span
                        className="ml-1.5 inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        {importSelectedItems.size}/{importSourceItems.length}
                      </span>
                    </Label>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5 rounded-lg font-semibold text-primary hover:bg-primary/10"
                      onClick={() => {
                        if (importSelectedItems.size === importSourceItems.length) setImportSelectedItems(new Set());
                        else setImportSelectedItems(new Set(importSourceItems.map(i => i.id)));
                      }}>
                      {importSelectedItems.size === importSourceItems.length ? "সব বাদ" : "সব নির্বাচন"}
                    </Button>
                  </div>
                  {importSourceItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">এই লেজারে কোনো আইটেম নেই</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                      {importSourceItems.map(item => {
                        const alreadyExists = masterItems?.some(m => m.name.toLowerCase() === item.name.toLowerCase());
                        const isSelected = importSelectedItems.has(item.id);
                        return (
                          <button key={item.id} disabled={alreadyExists}
                            onClick={() => setImportSelectedItems(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                              return next;
                            })}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border ${
                              alreadyExists ? "opacity-40 cursor-not-allowed border-transparent bg-muted/30" :
                              isSelected ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-muted/40 hover:bg-muted border-transparent"
                            }`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">{item.default_quantity} {item.unit}{alreadyExists ? " • ইতিমধ্যে আছে" : ""}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="relative px-5 py-4 border-t shrink-0"
              style={{ borderColor: 'var(--glass-border)', background: 'var(--card)' }}
            >
              <Button onClick={handleImport} disabled={importSelectedItems.size === 0 || importLoading}
                className="w-full h-12 rounded-2xl gradient-primary shadow-md font-bold gap-2">
                <Download className="w-4 h-4" />
                {importLoading ? "আমদানি হচ্ছে..." : `${importSelectedItems.size}টি আইটেম আমদানি করুন`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === SHOPPING MODE ===
  if (step === "shopping") {
    return (
      <div className="space-y-4">
        {/* Header with accent halo */}
        <div className="relative overflow-hidden rounded-2xl premium-card p-3.5">
          <div
            className="absolute -top-16 -right-12 w-44 h-44 rounded-full opacity-40 blur-3xl pointer-events-none"
            style={{ background: 'var(--gradient-primary)' }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={() => setStep("master")} className="gap-1 rounded-xl h-9 px-2">
              <ArrowLeft className="w-3.5 h-3.5" /> ফিরে
            </Button>
            <div className="text-center min-w-0">
              <h3 className="text-sm font-bold leading-tight">বাজার চলছে</h3>
              <p className="text-[10px] text-muted-foreground">{selectedItems.length}টি সিলেক্ট</p>
            </div>
            <Button size="sm" onClick={() => setStep("pricing")} disabled={selectedItems.length === 0}
              className="gap-1 rounded-xl gradient-primary shadow-sm font-semibold h-9 px-3 text-xs">
              পরবর্তী <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Recent items quick add */}
        {recentItems && recentItems.length > 0 && (
          <div>
            <SectionLabel icon={Sparkles} label="দ্রুত যোগ" />
            <div className="flex flex-wrap gap-1.5">
              {recentItems.slice(0, 5).map((item, i) => (
                <button key={i}
                  onClick={() => addRecentItemToShopping(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-accent transition-all hover:scale-105">
                  <Plus className="w-3 h-3 opacity-60" /> {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionLabel icon={ListChecks} label={`আইটেম (${shoppingItems.length})`} />
          <div className="space-y-1.5">
            {shoppingItems.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleItem(index)}
                className={`w-full text-left rounded-2xl p-3 transition-all duration-200 border ${
                  item.selected
                    ? "shadow-sm"
                    : "bg-card border-border hover:bg-accent/40"
                }`}
                style={item.selected ? { borderColor: 'var(--income-border)', background: 'var(--income-bg)' } : undefined}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all`}
                    style={item.selected
                      ? { background: 'var(--income-text-soft)' }
                      : { background: 'hsl(var(--muted))' }}
                  >
                    {item.selected
                      ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      : <Circle className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="outline" className="w-7 h-7 rounded-lg" onClick={() => adjustQty(index, -0.5)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="w-7 h-7 rounded-lg" onClick={() => adjustQty(index, 0.5)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-3 border border-dashed border-border bg-muted/30">
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="নতুন আইটেম যোগ করুন..."
              className="flex-1 rounded-xl bg-background" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInlineItem())} />
            <Button size="icon" onClick={addInlineItem} disabled={!newName.trim()} className="rounded-xl gradient-primary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === PRICING / POST-SHOPPING ===
  return (
    <div className="space-y-4">
      {/* Header with accent halo */}
      <div className="relative overflow-hidden rounded-2xl premium-card p-3.5">
        <div
          className="absolute -top-16 -right-12 w-44 h-44 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: 'var(--gradient-primary)' }}
        />
        <div className="relative flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => setStep("shopping")} className="gap-1 rounded-xl h-9 px-2">
            <ArrowLeft className="w-3.5 h-3.5" /> পিছনে
          </Button>
          <div className="text-center min-w-0">
            <h3 className="text-sm font-bold leading-tight">দাম লিখুন</h3>
            <p className="text-[10px] text-muted-foreground">{selectedItems.length}টি আইটেম</p>
          </div>
          <div className="w-14" />
        </div>
      </div>

      {/* Grand total hero */}
      <div className="relative gradient-primary rounded-2xl p-5 text-center shadow-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <p className="relative text-white/70 text-xs font-semibold uppercase tracking-wider">মোট বাজার</p>
        <p className="relative text-4xl font-extrabold text-white mt-1">৳{grandTotal.toLocaleString("bn-BD")}</p>
      </div>

      <div>
        <SectionLabel icon={Receipt} label="আইটেমের দাম" />
        <div className="space-y-2">
          {selectedItems.map((item, idx) => {
            const originalIndex = shoppingItems.findIndex((si) => si.name === item.name && si.masterId === item.masterId);
            const subtotal = item.useDirectTotal ? item.directTotal : item.quantity * item.pricePerUnit;
            return (
              <div key={idx} className="premium-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.quantity} {item.unit}</p>
                  </div>
                  {subtotal > 0 && (
                    <div className="px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'var(--income-bg)' }}>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--income-text)' }}>৳{subtotal.toLocaleString("bn-BD")}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={!item.useDirectTotal ? "font-bold text-foreground" : "text-muted-foreground"}>একক</span>
                  <Switch checked={item.useDirectTotal} onCheckedChange={() => togglePriceMode(originalIndex)} className="h-5 w-9" />
                  <span className={item.useDirectTotal ? "font-bold text-foreground" : "text-muted-foreground"}>মোট</span>
                </div>
                <CalculatorInput
                  placeholder={item.useDirectTotal ? "মোট দাম (৳)" : "প্রতি একক দাম (৳)"}
                  value={item.useDirectTotal
                    ? (item.directTotal ? item.directTotal.toString() : "")
                    : (item.pricePerUnit ? item.pricePerUnit.toString() : "")}
                  onChange={(v) => item.useDirectTotal ? setDirectTotalPrice(originalIndex, v) : setPrice(originalIndex, v)}
                  className="h-10 rounded-xl"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Account selection grid */}
      <div>
        <SectionLabel icon={Wallet} label="পেমেন্ট অ্যাকাউন্ট" />
        <div className="grid grid-cols-3 gap-1.5">
          {accounts.map((a) => {
            const isSelected = selectedAccount === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAccount(a.id)}
                className={`relative rounded-xl p-2.5 text-center transition-all border ${
                  isSelected
                    ? "shadow-sm scale-[0.98]"
                    : "bg-card border-border hover:bg-accent/40"
                }`}
                style={isSelected ? { background: 'var(--stat-pill-active-bg)', borderColor: 'hsl(var(--primary))' } : undefined}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
                    <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
                <div className="text-lg leading-none mb-1">{getAccountEmoji(a.name)}</div>
                <p className="text-[10px] font-semibold truncate leading-tight">{a.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={saveBatch}
        className="w-full h-12 rounded-2xl gap-2 gradient-primary shadow-md text-base font-semibold"
        disabled={saving || grandTotal <= 0 || !selectedAccount}>
        {saving ? "সেভ হচ্ছে..." : <><Check className="w-4 h-4" /> বাজার সেভ করুন</>}
      </Button>
    </div>
  );
};

export default GroceryModule;
