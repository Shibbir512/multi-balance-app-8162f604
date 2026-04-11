import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CalculatorInput from "./CalculatorInput";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  account_id: string | null;
  category_id: string | null;
  ledger_id: string;
}

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  ledgerId: string;
}

const TransactionEditDialog = ({ transaction, open, onOpenChange, accounts, categories, ledgerId }: Props) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category_id || "");
      setAccountId(transaction.account_id || "");
      setDate(transaction.date);
      setNote(transaction.note || "");
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === transaction?.type);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(amount),
          category_id: categoryId || null,
          account_id: accountId || null,
          date,
          note: note || null,
        })
        .eq("id", transaction!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("লেনদেন আপডেট হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").delete().eq("id", transaction!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
      onOpenChange(false);
      toast.success("লেনদেন মুছে ফেলা হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!transaction) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>লেনদেন সম্পাদনা</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>পরিমাণ (৳)</Label>
              <CalculatorInput value={amount} onChange={setAmount} required />
            </div>
            <div className="space-y-2">
              <Label>ক্যাটাগরি (ঐচ্ছিক)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="বাছুন" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>অ্যাকাউন্ট (ঐচ্ছিক)</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="বাছুন" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>তারিখ</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>নোট (ঐচ্ছিক)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "আপডেট হচ্ছে..." : "আপডেট"}
              </Button>
              <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                মুছুন
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>লেনদেন মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই লেনদেন স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "মুছছে..." : "মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionEditDialog;
