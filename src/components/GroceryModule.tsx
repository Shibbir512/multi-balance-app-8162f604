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
import {
  Plus, ShoppingCart, Package, Minus, Check, ArrowRight, ArrowLeft, List, X
} from "lucide-react";
import { toast } from "sonner";
import { useGroceryReminders } from "@/hooks/useGroceryReminders";
import GroceryReminders from "@/components/GroceryReminders";

interface ShoppingItem {
  masterId: string | null;
  name: string;
  unit: string;
  quantity: number;
  selected: boolean;
  pricePerUnit: number;
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
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("কেজি");
  const [newQty, setNewQty] = useState("1");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: masterItems, isLoading } = useQuery({
    queryKey: ["grocery-master", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_master_items")
        .select("*")
        .eq("ledger_id", ledgerId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reminders } = useGroceryReminders(ledgerId);

  const { data: batches } = useQuery({
    queryKey: ["grocery-batches", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_batches")
        .select("*")
        .eq("ledger_id", ledgerId)
        .eq("status", "completed")
        .order("batch_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const addMasterItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grocery_master_items").insert({
        ledger_id: ledgerId,
        user_id: user!.id,
        name: newName.trim(),
        unit: newUnit,
        default_quantity: parseFloat(newQty) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      setNewName("");
      setNewQty("1");
      setAddItemOpen(false);
      toast.success("আইটেম যোগ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startShopping = () => {
    const items: ShoppingItem[] = (masterItems ?? []).map((item) => ({
      masterId: item.id,
      name: item.name,
      unit: item.unit,
      quantity: item.default_quantity,
      selected: false,
      pricePerUnit: 0,
    }));
    setShoppingItems(items);
    setStep("shopping");
  };

  const toggleItem = (index: number) => {
    setShoppingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const adjustQty = (index: number, delta: number) => {
    setShoppingItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(0.5, item.quantity + delta) } : item
      )
    );
  };

  const setPrice = (index: number, price: string) => {
    setShoppingItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, pricePerUnit: parseFloat(price) || 0 } : item
      )
    );
  };

  const addInlineItem = () => {
    if (!newName.trim()) return;
    setShoppingItems((prev) => [
      ...prev,
      {
        masterId: null,
        name: newName.trim(),
        unit: newUnit,
        quantity: parseFloat(newQty) || 1,
        selected: true,
        pricePerUnit: 0,
      },
    ]);
    setNewName("");
    setNewQty("1");
  };

  const selectedItems = shoppingItems.filter((item) => item.selected);
  const grandTotal = selectedItems.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);

  const groceryCategory = categories.find(
    (c) => c.type === "expense" && (c.name.includes("খাবার") || c.name.includes("বাজার") || c.name.includes("grocery"))
  );

  const saveBatch = async () => {
    if (!selectedAccount || grandTotal <= 0) {
      toast.error("অ্যাকাউন্ট বাছুন এবং দাম দিন");
      return;
    }

    setSaving(true);
    try {
      // 1. Create expense transaction
      const categoryId = groceryCategory?.id ?? categories.find((c) => c.type === "expense")?.id;
      if (!categoryId) throw new Error("No expense category found");

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          ledger_id: ledgerId,
          user_id: user!.id,
          account_id: selectedAccount,
          category_id: categoryId,
          type: "expense",
          amount: grandTotal,
          date: new Date().toISOString().split("T")[0],
          note: `বাজার (${selectedItems.length} আইটেম)`,
        })
        .select()
        .single();
      if (txError) throw txError;

      // 2. Create grocery batch
      const { data: batch, error: batchError } = await supabase
        .from("grocery_batches")
        .insert({
          ledger_id: ledgerId,
          user_id: user!.id,
          total_amount: grandTotal,
          transaction_id: tx.id,
          status: "completed",
        })
        .select()
        .single();
      if (batchError) throw batchError;

      // 3. Save batch items
      const batchItems = selectedItems.map((item) => ({
        batch_id: batch.id,
        user_id: user!.id,
        master_item_id: item.masterId,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
        subtotal: item.quantity * item.pricePerUnit,
      }));
      const { error: itemsError } = await supabase.from("grocery_batch_items").insert(batchItems);
      if (itemsError) throw itemsError;

      // 4. Update master items last_purchase_date
      const masterIds = selectedItems.filter((i) => i.masterId).map((i) => i.masterId!);
      if (masterIds.length > 0) {
        await supabase
          .from("grocery_master_items")
          .update({ last_purchase_date: new Date().toISOString().split("T")[0] })
          .in("id", masterIds);
      }

      // 5. Add new inline items to master list
      const newItems = selectedItems.filter((i) => !i.masterId);
      if (newItems.length > 0) {
        await supabase.from("grocery_master_items").insert(
          newItems.map((item) => ({
            ledger_id: ledgerId,
            user_id: user!.id,
            name: item.name,
            unit: item.unit,
            default_quantity: item.quantity,
            last_purchase_date: new Date().toISOString().split("T")[0],
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ["grocery-master", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["grocery-batches", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });

      toast.success(`বাজার সেভ হয়েছে! মোট: ৳${grandTotal.toLocaleString("bn-BD")}`);
      setStep("master");
      setShoppingItems([]);
      setSelectedAccount("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
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

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
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
              <Card key={item.id} className="animate-fade-in">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.default_quantity} {item.unit}
                      {item.last_purchase_date && ` • শেষ কেনা: ${item.last_purchase_date}`}
                    </p>
                  </div>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent batches */}
        {batches && batches.length > 0 && (
          <div className="mt-6">
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
            <DialogHeader>
              <DialogTitle>নতুন আইটেম যোগ করুন</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMasterItem.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="যেমন: চাল, তেল, ডাল..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>একক</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
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
          <Button
            size="sm"
            onClick={() => setStep("pricing")}
            disabled={selectedItems.length === 0}
            className="gap-1"
          >
            পরবর্তী <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {selectedItems.length} টি আইটেম সিলেক্ট করা হয়েছে
        </p>

        <div className="space-y-1.5">
          {shoppingItems.map((item, index) => (
            <Card key={index} className={`transition-colors ${item.selected ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => toggleItem(index)}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-7 h-7"
                    onClick={() => adjustQty(index, -0.5)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-7 h-7"
                    onClick={() => adjustQty(index, 0.5)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inline add */}
        <Card className="border-dashed">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="নতুন আইটেম..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInlineItem())}
              />
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
          const originalIndex = shoppingItems.findIndex(
            (si) => si.name === item.name && si.masterId === item.masterId
          );
          const subtotal = item.quantity * item.pricePerUnit;
          return (
            <Card key={idx} className="animate-fade-in">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  {subtotal > 0 && (
                    <p className="text-sm font-semibold">৳{subtotal.toLocaleString("bn-BD")}</p>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="প্রতি একক দাম (৳)"
                  value={item.pricePerUnit || ""}
                  onChange={(e) => setPrice(originalIndex, e.target.value)}
                  min="0"
                  step="0.5"
                  className="h-9"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grand total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">মোট বাজার</p>
          <p className="text-2xl font-bold text-foreground">৳{grandTotal.toLocaleString("bn-BD")}</p>
        </CardContent>
      </Card>

      {/* Account selection */}
      <div className="space-y-2">
        <Label>পেমেন্ট অ্যাকাউন্ট</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger><SelectValue placeholder="অ্যাকাউন্ট বাছুন" /></SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={saveBatch}
        className="w-full h-12 gap-2"
        disabled={saving || grandTotal <= 0 || !selectedAccount}
      >
        {saving ? (
          "সেভ হচ্ছে..."
        ) : (
          <>
            <Check className="w-4 h-4" /> বাজার সেভ করুন
          </>
        )}
      </Button>
    </div>
  );
};

export default GroceryModule;
