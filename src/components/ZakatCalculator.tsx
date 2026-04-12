import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calculator, History, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import CalculatorInput from "./CalculatorInput";

const DEFAULT_GOLD_PRICE = 9500;
const DEFAULT_SILVER_PRICE = 120;
const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;

interface Props { ledgerId: string; }

const ZakatCalculator = ({ ledgerId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [useCustomNisab, setUseCustomNisab] = useState(false);
  const [customNisab, setCustomNisab] = useState("");
  const [goldPricePerGram, setGoldPricePerGram] = useState(DEFAULT_GOLD_PRICE.toString());
  const [silverPricePerGram, setSilverPricePerGram] = useState(DEFAULT_SILVER_PRICE.toString());

  const [cash, setCash] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [mobileBanking, setMobileBanking] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [silverGrams, setSilverGrams] = useState("");
  const [businessAssets, setBusinessAssets] = useState("");
  const [receivables, setReceivables] = useState("");
  const [loans, setLoans] = useState("");
  const [payables, setPayables] = useState("");

  const [result, setResult] = useState<{
    totalAssets: number; totalLiabilities: number; netWealth: number;
    nisab: number; zakatAmount: number; isDue: boolean;
  } | null>(null);

  const { data: history } = useQuery({
    queryKey: ["zakat-history", ledgerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("zakat_calculations").select("*").eq("ledger_id", ledgerId).order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) return;
      const gp = num(goldPricePerGram) || DEFAULT_GOLD_PRICE;
      const sp = num(silverPricePerGram) || DEFAULT_SILVER_PRICE;
      const { error } = await supabase.from("zakat_calculations").insert({
        ledger_id: ledgerId, user_id: user!.id, year: new Date().getFullYear(),
        cash: num(cash), bank_balance: num(bankBalance), mobile_banking: num(mobileBanking),
        gold_grams: num(goldGrams), gold_value: num(goldGrams) * gp,
        silver_grams: num(silverGrams), silver_value: num(silverGrams) * sp,
        business_assets: num(businessAssets), receivables: num(receivables),
        loans: num(loans), payables: num(payables),
        total_assets: result.totalAssets, total_liabilities: result.totalLiabilities,
        net_wealth: result.netWealth, nisab_amount: result.nisab,
        zakat_amount: result.zakatAmount, is_zakat_due: result.isDue,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-history", ledgerId] });
      toast.success("যাকাত হিসাব সেভ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const num = (v: string) => parseFloat(v) || 0;

  const calculate = () => {
    const gp = num(goldPricePerGram) || DEFAULT_GOLD_PRICE;
    const sp = num(silverPricePerGram) || DEFAULT_SILVER_PRICE;
    const goldValue = num(goldGrams) * gp;
    const silverValue = num(silverGrams) * sp;
    const totalAssets = num(cash) + num(bankBalance) + num(mobileBanking) + goldValue + silverValue + num(businessAssets) + num(receivables);
    const totalLiabilities = num(loans) + num(payables);
    const netWealth = totalAssets - totalLiabilities;

    const nisab = useCustomNisab && num(customNisab) > 0
      ? num(customNisab)
      : Math.min(NISAB_GOLD_GRAMS * gp, NISAB_SILVER_GRAMS * sp);

    const isDue = netWealth >= nisab;
    const zakatAmount = isDue ? netWealth * 0.025 : 0;
    setResult({ totalAssets, totalLiabilities, netWealth, nisab, zakatAmount, isDue });
  };

  const fmt = (n: number) => `৳${n.toLocaleString("bn-BD", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      {/* Nisab Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            নিসাব সেটিংস
            <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <span>স্বয়ংক্রিয়</span>
              <Switch checked={useCustomNisab} onCheckedChange={setUseCustomNisab} className="h-4 w-8" />
              <span>কাস্টম</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {useCustomNisab ? (
            <Field label="নিসাব পরিমাণ (৳)" value={customNisab} onChange={setCustomNisab} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="স্বর্ণ মূল্য (৳/গ্রাম)" value={goldPricePerGram} onChange={setGoldPricePerGram} />
              <Field label="রুপা মূল্য (৳/গ্রাম)" value={silverPricePerGram} onChange={setSilverPricePerGram} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">সম্পদ (Assets)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="নগদ টাকা" value={cash} onChange={setCash} />
          <Field label="ব্যাংক ব্যালেন্স" value={bankBalance} onChange={setBankBalance} />
          <Field label="মোবাইল ব্যাংকিং" value={mobileBanking} onChange={setMobileBanking} />
          <Field label="স্বর্ণ (গ্রাম)" value={goldGrams} onChange={setGoldGrams} hint={`@${num(goldPricePerGram) || DEFAULT_GOLD_PRICE}৳/গ্রাম`} />
          <Field label="রুপা (গ্রাম)" value={silverGrams} onChange={setSilverGrams} hint={`@${num(silverPricePerGram) || DEFAULT_SILVER_PRICE}৳/গ্রাম`} />
          <Field label="ব্যবসায়িক সম্পদ" value={businessAssets} onChange={setBusinessAssets} />
          <Field label="পাওনা (Receivables)" value={receivables} onChange={setReceivables} />
        </CardContent>
      </Card>

      {/* Liabilities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">দায় (Liabilities)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="ঋণ / লোন" value={loans} onChange={setLoans} />
          <Field label="দেনা (Payables)" value={payables} onChange={setPayables} />
        </CardContent>
      </Card>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="w-4 h-4" /> যাকাত হিসাব করুন
      </Button>

      {result && (
        <Card className={result.isDue ? "border-primary" : "border-muted"}>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">মোট সম্পদ</span><span className="font-medium">{fmt(result.totalAssets)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">মোট দায়</span><span className="font-medium">{fmt(result.totalLiabilities)}</span></div>
            <div className="flex justify-between text-sm border-t pt-2"><span className="text-muted-foreground">নিট সম্পদ</span><span className="font-bold">{fmt(result.netWealth)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">নিসাব</span><span>{fmt(result.nisab)}</span></div>
            <div className={`flex justify-between text-sm border-t pt-2 ${result.isDue ? "text-primary" : "text-muted-foreground"}`}>
              <span className="font-semibold">{result.isDue ? "যাকাত প্রদেয়" : "যাকাত প্রযোজ্য নয়"}</span>
              <span className="font-bold text-lg">{result.isDue ? fmt(result.zakatAmount) : "—"}</span>
            </div>
            {result.isDue && (
              <Button onClick={() => saveMutation.mutate()} variant="outline" className="w-full mt-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "সেভ হচ্ছে..." : "এই হিসাব সেভ করুন"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {history && history.length > 0 && (
        <div>
          <Button variant="ghost" className="w-full gap-2 text-sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4" /> পূর্ববর্তী যাকাত হিসাব ({history.length})
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{h.year} সাল</p>
                      <p className="text-xs text-muted-foreground">নিট সম্পদ: {fmt(h.net_wealth)}</p>
                    </div>
                    <p className={`font-bold ${h.is_zakat_due ? "text-primary" : "text-muted-foreground"}`}>
                      {h.is_zakat_due ? fmt(h.zakat_amount) : "প্রযোজ্য নয়"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label} {hint && <span className="font-normal normal-case">({hint})</span>}</Label>
    <CalculatorInput value={value} onChange={onChange} placeholder="0" className="form-input" />
  </div>
);

export default ZakatCalculator;
