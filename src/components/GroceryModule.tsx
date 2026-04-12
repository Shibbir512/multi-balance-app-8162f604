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
  Plus, ShoppingCart, Package, Minus, Check, ArrowRight, ArrowLeft, Pencil, Trash2, Clock, Sparkles, CheckCircle2, Circle, Download
} from "lucide-react";
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
      const { data: tx, error: txError } = await supabase.from("transactions").insert({
        ledger_id: ledgerId, user_id: user!.id, account_id: selectedAccount,
        category_id: categoryId || null, type: "expense", amount: grandTotal,
        date: new Date().toISOString().split("T")[0], note: `বাজার (${selectedItems.length} আইটেম)`,
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">মাস্টার আইটেম</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)} className="gap-1.5 rounded-xl">
              <Plus className="w-3 h-3" /> যোগ
            </Button>
            <Button size="sm" onClick={startShopping} disabled={!masterItems?.length} className="gap-1.5 rounded-xl gradient-primary shadow-sm font-semibold">
              <ShoppingCart className="w-3 h-3" /> বাজার করুন
            </Button>
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
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Circle className="w-3 h-3" /> বাকি আইটেম ({remainingItems.length})
                </h4>
                {remainingItems.map((item) => renderMasterItem(item, false))}
              </div>
            )}

            {/* Completed items */}
            {completedItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--grocery-check-color)' }}>
                  <CheckCircle2 className="w-3 h-3" /> সম্পন্ন ({completedItems.length})
                </h4>
                {completedItems.map((item) => renderMasterItem(item, true))}
              </div>
            )}
          </>
        )}

        {/* Recent items quick access */}
        {recentItems && recentItems.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" /> সাম্প্রতিক বাজার আইটেম
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentItems.map((item, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs h-8 rounded-xl gap-1"
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
                  <Plus className="w-3 h-3" /> {item.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recent batches */}
        {batches && batches.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold mb-2.5">সাম্প্রতিক বাজার</h3>
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
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle>নতুন আইটেম যোগ করুন</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMasterItem.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="যেমন: চাল, তেল, ডাল..." required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" className="rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-2xl gradient-primary shadow-md font-semibold" disabled={addMasterItem.isPending}>
                {addMasterItem.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle>আইটেম সম্পাদনা</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editItem) updateMasterItem.mutate({ id: editItem.id, name: newName.trim(), unit: newUnit, default_quantity: parseFloat(newQty) || 1 });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" className="rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-2xl gradient-primary shadow-md font-semibold" disabled={updateMasterItem.isPending}>
                {updateMasterItem.isPending ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>আইটেম মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>এই আইটেম মাস্টার লিস্ট থেকে মুছে যাবে।</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItemId && deleteMasterItem.mutate(deleteItemId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                মুছে ফেলুন
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // === SHOPPING MODE ===
  if (step === "shopping") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => setStep("master")} className="gap-1 rounded-xl">
            <ArrowLeft className="w-3 h-3" /> ফিরে যান
          </Button>
          <h3 className="text-sm font-bold">বাজারের তালিকা</h3>
          <Button size="sm" onClick={() => setStep("pricing")} disabled={selectedItems.length === 0} className="gap-1 rounded-xl gradient-primary shadow-sm font-semibold">
            পরবর্তী <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        <div className="bg-muted/50 rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground font-medium">{selectedItems.length} টি আইটেম সিলেক্ট করা হয়েছে</p>
        </div>

        {/* Recent items quick add in shopping */}
        {recentItems && recentItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">সাম্প্রতিক আইটেম দ্রুত যোগ:</p>
            <div className="flex flex-wrap gap-1.5">
              {recentItems.slice(0, 5).map((item, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs h-8 rounded-xl gap-1" onClick={() => addRecentItemToShopping(item)}>
                  <Plus className="w-3 h-3" /> {item.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {shoppingItems.map((item, index) => (
            <div
              key={index}
              className={`premium-card p-3.5 transition-all duration-200 ${
                item.selected
                  ? "ring-1"
                  : ""
              }`}
              style={item.selected ? { borderColor: 'var(--income-border)', background: 'var(--income-bg)', boxShadow: 'var(--shadow-card-hover)' } : undefined}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => toggleItem(index)}
                  className="shrink-0 w-5 h-5 rounded-md border-2"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${item.selected ? "" : ""}`}>{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" onClick={() => adjustQty(index, -0.5)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" onClick={() => adjustQty(index, 0.5)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-card p-3.5 border-dashed">
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="নতুন আইটেম..."
              className="flex-1 rounded-xl" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInlineItem())} />
            <Button size="icon" variant="outline" onClick={addInlineItem} disabled={!newName.trim()} className="rounded-xl">
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
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setStep("shopping")} className="gap-1 rounded-xl">
          <ArrowLeft className="w-3 h-3" /> পিছনে
        </Button>
        <h3 className="text-sm font-bold">দাম লিখুন</h3>
        <div className="w-16" />
      </div>

      <div className="space-y-2">
        {selectedItems.map((item, idx) => {
          const originalIndex = shoppingItems.findIndex((si) => si.name === item.name && si.masterId === item.masterId);
          const subtotal = item.useDirectTotal ? item.directTotal : item.quantity * item.pricePerUnit;
          return (
            <div key={idx} className="premium-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                </div>
                {subtotal > 0 && <p className="text-base font-bold" style={{ color: 'var(--income-text)' }}>৳{subtotal.toLocaleString("bn-BD")}</p>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={!item.useDirectTotal ? "font-semibold text-foreground" : ""}>একক দাম</span>
                <Switch checked={item.useDirectTotal} onCheckedChange={() => togglePriceMode(originalIndex)} className="h-5 w-9" />
                <span className={item.useDirectTotal ? "font-semibold text-foreground" : ""}>মোট দাম</span>
              </div>
              {item.useDirectTotal ? (
                <CalculatorInput
                  placeholder="মোট দাম (৳)"
                  value={item.directTotal ? item.directTotal.toString() : ""}
                  onChange={(v) => setDirectTotalPrice(originalIndex, v)}
                  className="h-10 rounded-xl"
                />
              ) : (
                <CalculatorInput
                  placeholder="প্রতি একক দাম (৳)"
                  value={item.pricePerUnit ? item.pricePerUnit.toString() : ""}
                  onChange={(v) => setPrice(originalIndex, v)}
                  className="h-10 rounded-xl"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total hero */}
      <div className="gradient-primary rounded-2xl p-5 text-center shadow-hero">
        <p className="text-white/70 text-xs font-medium">মোট বাজার</p>
        <p className="text-3xl font-extrabold text-white">৳{grandTotal.toLocaleString("bn-BD")}</p>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">পেমেন্ট অ্যাকাউন্ট</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="অ্যাকাউন্ট বাছুন" /></SelectTrigger>
          <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Button onClick={saveBatch} className="w-full h-12 rounded-2xl gap-2 gradient-primary shadow-md text-base font-semibold" disabled={saving || grandTotal <= 0 || !selectedAccount}>
        {saving ? "সেভ হচ্ছে..." : <><Check className="w-4 h-4" /> বাজার সেভ করুন</>}
      </Button>
    </div>
  );
};

export default GroceryModule;
