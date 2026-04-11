import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Plus, ShoppingCart, Package, Minus, Check, ArrowRight, ArrowLeft, Pencil, Trash2, Clock
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

  // Recent batch items for quick access
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
      // Deduplicate by name
      const seen = new Set<string>();
      return (data || []).filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      }).slice(0, 8);
    },
  });

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

      // Update master items
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

      // Add new inline items to master list
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

  // === MASTER LIST VIEW ===
  if (step === "master") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">মাস্টার আইটেম</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)} className="gap-1">
              <Plus className="w-3 h-3" /> যোগ
            </Button>
            <Button size="sm" onClick={startShopping} disabled={!masterItems?.length} className="gap-1">
              <ShoppingCart className="w-3 h-3" /> বাজার করুন
            </Button>
          </div>
        </div>

        {reminders && reminders.length > 0 && <GroceryReminders reminders={reminders} />}

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : !masterItems?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              কোনো আইটেম নেই। আইটেম যোগ করুন।
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {masterItems.map((item) => (
              <Card key={item.id} className="animate-fade-in group">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.default_quantity} {item.unit}
                      {item.last_purchase_date && ` • শেষ কেনা: ${item.last_purchase_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditItem(item); setNewName(item.name); setNewUnit(item.unit); setNewQty(item.default_quantity.toString()); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => setDeleteItemId(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent items quick access */}
        {recentItems && recentItems.length > 0 && step === "master" && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> সাম্প্রতিক বাজার আইটেম
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentItems.map((item, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs h-7"
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
                  <Plus className="w-3 h-3 mr-1" /> {item.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recent batches */}
        {batches && batches.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">সাম্প্রতিক বাজার</h3>
            <div className="space-y-1.5">
              {batches.map((b) => (
                <Card key={b.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <p className="text-sm">{b.batch_date}</p>
                    <p className="text-sm font-semibold text-destructive">৳{b.total_amount.toLocaleString("bn-BD")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add Item Dialog */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>নতুন আইটেম যোগ করুন</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMasterItem.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="যেমন: চাল, তেল, ডাল..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addMasterItem.isPending}>
                {addMasterItem.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>আইটেম সম্পাদনা</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editItem) updateMasterItem.mutate({ id: editItem.id, name: newName.trim(), unit: newUnit, default_quantity: parseFloat(newQty) || 1 });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ডিফল্ট পরিমাণ</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0.1" step="0.1" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateMasterItem.isPending}>
                {updateMasterItem.isPending ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>আইটেম মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>এই আইটেম মাস্টার লিস্ট থেকে মুছে যাবে।</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItemId && deleteMasterItem.mutate(deleteItemId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
          <Button size="sm" variant="ghost" onClick={() => setStep("master")} className="gap-1">
            <ArrowLeft className="w-3 h-3" /> ফিরে যান
          </Button>
          <h3 className="text-sm font-semibold">বাজারের তালিকা</h3>
          <Button size="sm" onClick={() => setStep("pricing")} disabled={selectedItems.length === 0} className="gap-1">
            পরবর্তী <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">{selectedItems.length} টি আইটেম সিলেক্ট করা হয়েছে</p>

        {/* Recent items quick add in shopping */}
        {recentItems && recentItems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">সাম্প্রতিক আইটেম দ্রুত যোগ:</p>
            <div className="flex flex-wrap gap-1.5">
              {recentItems.slice(0, 5).map((item, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs h-7" onClick={() => addRecentItemToShopping(item)}>
                  <Plus className="w-3 h-3 mr-1" /> {item.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {shoppingItems.map((item, index) => (
            <Card key={index} className={`transition-colors ${item.selected ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(index)} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => adjustQty(index, -0.5)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => adjustQty(index, 0.5)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="নতুন আইটেম..."
                className="flex-1" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInlineItem())} />
              <Button size="icon" variant="outline" onClick={addInlineItem} disabled={!newName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === PRICING / POST-SHOPPING ===
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setStep("shopping")} className="gap-1">
          <ArrowLeft className="w-3 h-3" /> পিছনে
        </Button>
        <h3 className="text-sm font-semibold">দাম লিখুন</h3>
        <div className="w-16" />
      </div>

      <div className="space-y-1.5">
        {selectedItems.map((item, idx) => {
          const originalIndex = shoppingItems.findIndex((si) => si.name === item.name && si.masterId === item.masterId);
          const subtotal = item.useDirectTotal ? item.directTotal : item.quantity * item.pricePerUnit;
          return (
            <Card key={idx} className="animate-fade-in">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                  </div>
                  {subtotal > 0 && <p className="text-sm font-semibold">৳{subtotal.toLocaleString("bn-BD")}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>একক দাম</span>
                  <Switch checked={item.useDirectTotal} onCheckedChange={() => togglePriceMode(originalIndex)} className="h-4 w-8" />
                  <span>মোট দাম</span>
                </div>
                {item.useDirectTotal ? (
                  <CalculatorInput
                    placeholder="মোট দাম (৳)"
                    value={item.directTotal ? item.directTotal.toString() : ""}
                    onChange={(v) => setDirectTotalPrice(originalIndex, v)}
                    className="h-9"
                  />
                ) : (
                  <CalculatorInput
                    placeholder="প্রতি একক দাম (৳)"
                    value={item.pricePerUnit ? item.pricePerUnit.toString() : ""}
                    onChange={(v) => setPrice(originalIndex, v)}
                    className="h-9"
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">মোট বাজার</p>
          <p className="text-2xl font-bold text-foreground">৳{grandTotal.toLocaleString("bn-BD")}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>পেমেন্ট অ্যাকাউন্ট</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger><SelectValue placeholder="অ্যাকাউন্ট বাছুন" /></SelectTrigger>
          <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Button onClick={saveBatch} className="w-full h-12 gap-2" disabled={saving || grandTotal <= 0 || !selectedAccount}>
        {saving ? "সেভ হচ্ছে..." : <><Check className="w-4 h-4" /> বাজার সেভ করুন</>}
      </Button>
    </div>
  );
};

export default GroceryModule;
