import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Calculator, History, ChevronDown, ChevronUp, Save,
  Banknote, Landmark, Smartphone, CircleDot, Briefcase,
  HandCoins, CreditCard, Receipt, Settings2, TrendingDown, ListChecks
} from "lucide-react";

const SectionLabel = ({ icon: Icon, label, accent }: { icon: any; label: string; accent?: string }) => (
  <div className="flex items-center gap-1.5 mb-2 px-0.5">
    <Icon className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} style={accent ? { color: accent } : undefined} />
    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">{label}</span>
    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
  </div>
);
import { toast } from "sonner";
import CalculatorInput from "./CalculatorInput";

const DEFAULT_GOLD_PRICE = 9500;
const DEFAULT_SILVER_PRICE = 120;
const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;

interface Props { ledgerId: string; }

const num = (v: string) => parseFloat(v) || 0;
const fmt = (n: number) => `৳${n.toLocaleString("bn-BD", { maximumFractionDigits: 0 })}`;

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

  // Live calculation
  const calculate = useCallback(() => {
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
    return { totalAssets, totalLiabilities, netWealth, nisab, zakatAmount, isDue };
  }, [cash, bankBalance, mobileBanking, goldGrams, silverGrams, businessAssets, receivables, loans, payables, goldPricePerGram, silverPricePerGram, useCustomNisab, customNisab]);

  const [result, setResult] = useState(() => calculate());

  useEffect(() => {
    setResult(calculate());
  }, [calculate]);

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

  const hasAnyValue = num(cash) > 0 || num(bankBalance) > 0 || num(mobileBanking) > 0 || num(goldGrams) > 0 || num(silverGrams) > 0 || num(businessAssets) > 0 || num(receivables) > 0;

  return (
    <div className="space-y-4">
      {/* Live Result Card - always visible at top */}
      <div className={`premium-card p-4 transition-all duration-300 ${result.isDue ? 'border-emerald-500/30' : ''}`}
        style={result.isDue ? { background: 'var(--income-bg)' } : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">যাকাত হিসাব</p>
              <p className="text-[10px] text-muted-foreground">লাইভ আপডেট</p>
            </div>
          </div>
          {result.isDue && hasAnyValue && (
            <Button
              onClick={() => saveMutation.mutate()}
              size="sm"
              className="h-8 rounded-full gap-1.5 text-xs btn-primary"
              disabled={saveMutation.isPending}
            >
              <Save className="w-3 h-3" />
              {saveMutation.isPending ? "সেভ..." : "সেভ"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">সম্পদ</p>
            <p className="text-sm font-bold text-foreground">{fmt(result.totalAssets)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">নিসাব</p>
            <p className="text-sm font-semibold text-muted-foreground">{fmt(result.nisab)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: result.isDue ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
              {result.isDue ? "প্রদেয়" : "প্রযোজ্য নয়"}
            </p>
            <p className="text-sm font-extrabold" style={{ color: result.isDue ? 'var(--income-text)' : 'var(--expense-text)' }}>
              {result.isDue ? fmt(result.zakatAmount) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Nisab Settings */}
      <div className="premium-card overflow-hidden">
        <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">নিসাব সেটিংস</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>স্বয়ংক্রিয়</span>
            <Switch checked={useCustomNisab} onCheckedChange={setUseCustomNisab} className="h-4 w-8" />
            <span>কাস্টম</span>
          </div>
        </div>
        <div className="p-3">
          {useCustomNisab ? (
            <ZField icon={CircleDot} label="নিসাব পরিমাণ (৳)" value={customNisab} onChange={setCustomNisab} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ZField icon={CircleDot} label="স্বর্ণ (৳/গ্রাম)" value={goldPricePerGram} onChange={setGoldPricePerGram} />
              <ZField icon={CircleDot} label="রুপা (৳/গ্রাম)" value={silverPricePerGram} onChange={setSilverPricePerGram} />
            </div>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="premium-card overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--income-bg)' }}>
            <Briefcase className="w-3 h-3" style={{ color: 'var(--income-text-soft)' }} />
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">সম্পদ (Assets)</span>
        </div>
        <div className="p-3 space-y-3">
          <ZField icon={Banknote} label="নগদ টাকা" value={cash} onChange={setCash} />
          <ZField icon={Landmark} label="ব্যাংক ব্যালেন্স" value={bankBalance} onChange={setBankBalance} />
          <ZField icon={Smartphone} label="মোবাইল ব্যাংকিং" value={mobileBanking} onChange={setMobileBanking} />
          <div className="grid grid-cols-2 gap-3">
            <ZField icon={CircleDot} label="স্বর্ণ (গ্রাম)" value={goldGrams} onChange={setGoldGrams} hint={`@${num(goldPricePerGram) || DEFAULT_GOLD_PRICE}৳`} />
            <ZField icon={CircleDot} label="রুপা (গ্রাম)" value={silverGrams} onChange={setSilverGrams} hint={`@${num(silverPricePerGram) || DEFAULT_SILVER_PRICE}৳`} />
          </div>
          <ZField icon={Briefcase} label="ব্যবসায়িক সম্পদ" value={businessAssets} onChange={setBusinessAssets} />
          <ZField icon={HandCoins} label="পাওনা (Receivables)" value={receivables} onChange={setReceivables} />
        </div>
      </div>

      {/* Liabilities */}
      <div className="premium-card overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--expense-bg)' }}>
            <Receipt className="w-3 h-3" style={{ color: 'var(--expense-text-soft)' }} />
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">দায় (Liabilities)</span>
        </div>
        <div className="p-3 space-y-3">
          <ZField icon={CreditCard} label="ঋণ / লোন" value={loans} onChange={setLoans} />
          <ZField icon={Receipt} label="দেনা (Payables)" value={payables} onChange={setPayables} />
        </div>
      </div>

      {/* Detailed breakdown */}
      {hasAnyValue && (
        <div className="premium-card p-3 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">বিস্তারিত</p>
          <Row label="মোট সম্পদ" value={fmt(result.totalAssets)} />
          <Row label="মোট দায়" value={fmt(result.totalLiabilities)} />
          <div className="border-t pt-2" style={{ borderColor: 'var(--glass-border)' }}>
            <Row label="নিট সম্পদ" value={fmt(result.netWealth)} bold />
          </div>
          <Row label="নিসাব" value={fmt(result.nisab)} />
          <div className="border-t pt-2" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold" style={{ color: result.isDue ? 'var(--income-text)' : 'var(--expense-text)' }}>
                {result.isDue ? "যাকাত প্রদেয় (২.৫%)" : "যাকাত প্রযোজ্য নয়"}
              </span>
              <span className="text-lg font-extrabold" style={{ color: result.isDue ? 'var(--income-text)' : 'var(--expense-text)' }}>
                {result.isDue ? fmt(result.zakatAmount) : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <Button variant="ghost" className="w-full gap-2 text-xs rounded-xl" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4" /> পূর্ববর্তী হিসাব ({history.length})
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map((h) => (
                <div key={h.id} className="premium-card p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{h.year} সাল</p>
                    <p className="text-[11px] text-muted-foreground">নিট সম্পদ: {fmt(h.net_wealth)}</p>
                  </div>
                  <p className="font-bold text-sm" style={{ color: h.is_zakat_due ? 'var(--income-text)' : 'var(--expense-text)' }}>
                    {h.is_zakat_due ? fmt(h.zakat_amount) : "প্রযোজ্য নয়"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* Sub-components */
const ZField = ({ icon: Icon, label, value, onChange, hint }: {
  icon: React.ElementType; label: string; value: string; onChange: (v: string) => void; hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      {label}
      {hint && <span className="font-normal text-[10px]">({hint})</span>}
    </Label>
    <CalculatorInput value={value} onChange={onChange} placeholder="0" className="form-input" />
  </div>
);

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={bold ? "font-bold text-foreground" : "font-medium text-foreground"}>{value}</span>
  </div>
);

export default ZakatCalculator;
