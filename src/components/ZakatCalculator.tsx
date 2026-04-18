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
    <div className="space-y-5">
      {/* Premium Hero Card with accent halo */}
      <div className="relative overflow-hidden rounded-2xl premium-card p-5">
        {/* Accent halos */}
        <div
          className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-50 blur-3xl pointer-events-none"
          style={{ background: result.isDue ? 'var(--income-bg)' : 'var(--gradient-primary)' }}
        />
        <div
          className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'var(--gradient-primary)' }}
        />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">যাকাত হিসাব</p>
                <p className="text-[10px] text-muted-foreground">লাইভ আপডেট</p>
              </div>
            </div>
            {result.isDue && hasAnyValue && (
              <Button
                onClick={() => saveMutation.mutate()}
                size="sm"
                className="h-9 rounded-xl gap-1.5 text-xs gradient-primary shadow-sm font-semibold px-3"
                disabled={saveMutation.isPending}
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? "সেভ..." : "সেভ"}
              </Button>
            )}
          </div>

          {/* Big zakat amount display */}
          <div className="text-center py-2">
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1"
              style={{ color: result.isDue ? 'var(--income-text-soft)' : 'var(--expense-text-soft)' }}>
              {result.isDue ? "প্রদেয় যাকাত" : "যাকাত প্রযোজ্য নয়"}
            </p>
            <p className="text-4xl font-extrabold tabular-nums tracking-tight"
              style={{ color: result.isDue ? 'var(--income-text)' : 'hsl(var(--muted-foreground))' }}>
              {result.isDue ? fmt(result.zakatAmount) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">নিট সম্পদের ২.৫%</p>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">সম্পদ</p>
              <p className="text-xs font-bold tabular-nums">{fmt(result.totalAssets)}</p>
            </div>
            <div className="text-center border-x" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">নিট</p>
              <p className="text-xs font-bold tabular-nums">{fmt(result.netWealth)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">নিসাব</p>
              <p className="text-xs font-bold tabular-nums">{fmt(result.nisab)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nisab Settings */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-3 h-3 text-muted-foreground/70" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">নিসাব সেটিংস</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={!useCustomNisab ? "font-bold text-foreground" : ""}>স্বয়ংক্রিয়</span>
            <Switch checked={useCustomNisab} onCheckedChange={setUseCustomNisab} className="h-4 w-8" />
            <span className={useCustomNisab ? "font-bold text-foreground" : ""}>কাস্টম</span>
          </div>
        </div>
        <div className="premium-card p-3">
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
      <div>
        <SectionLabel icon={Briefcase} label="সম্পদ (Assets)" accent="var(--income-text-soft)" />
        <div className="premium-card p-3 space-y-3">
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
      <div>
        <SectionLabel icon={TrendingDown} label="দায় (Liabilities)" accent="var(--expense-text-soft)" />
        <div className="premium-card p-3 space-y-3">
          <ZField icon={CreditCard} label="ঋণ / লোন" value={loans} onChange={setLoans} />
          <ZField icon={Receipt} label="দেনা (Payables)" value={payables} onChange={setPayables} />
        </div>
      </div>

      {/* Detailed breakdown */}
      {hasAnyValue && (
        <div>
          <SectionLabel icon={ListChecks} label="বিস্তারিত হিসাব" />
          <div className="premium-card p-3.5 space-y-2">
            <Row label="মোট সম্পদ" value={fmt(result.totalAssets)} />
            <Row label="মোট দায়" value={fmt(result.totalLiabilities)} />
            <div className="border-t pt-2" style={{ borderColor: 'var(--glass-border)' }}>
              <Row label="নিট সম্পদ" value={fmt(result.netWealth)} bold />
            </div>
            <Row label="নিসাব" value={fmt(result.nisab)} />
            <div className="border-t pt-2.5 mt-1" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold" style={{ color: result.isDue ? 'var(--income-text)' : 'var(--expense-text)' }}>
                  {result.isDue ? "যাকাত প্রদেয় (২.৫%)" : "যাকাত প্রযোজ্য নয়"}
                </span>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: result.isDue ? 'var(--income-text)' : 'var(--expense-text)' }}>
                  {result.isDue ? fmt(result.zakatAmount) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <Button variant="ghost" className="w-full gap-2 text-xs rounded-xl h-10" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4" /> পূর্ববর্তী হিসাব ({history.length})
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map((h) => (
                <div key={h.id} className="premium-card p-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{h.year} সাল</p>
                    <p className="text-[11px] text-muted-foreground">নিট সম্পদ: {fmt(h.net_wealth)}</p>
                  </div>
                  <p className="font-bold text-sm tabular-nums" style={{ color: h.is_zakat_due ? 'var(--income-text)' : 'var(--expense-text)' }}>
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
