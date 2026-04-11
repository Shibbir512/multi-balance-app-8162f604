
CREATE TABLE public.zakat_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  cash NUMERIC NOT NULL DEFAULT 0,
  bank_balance NUMERIC NOT NULL DEFAULT 0,
  mobile_banking NUMERIC NOT NULL DEFAULT 0,
  gold_grams NUMERIC NOT NULL DEFAULT 0,
  gold_value NUMERIC NOT NULL DEFAULT 0,
  silver_grams NUMERIC NOT NULL DEFAULT 0,
  silver_value NUMERIC NOT NULL DEFAULT 0,
  business_assets NUMERIC NOT NULL DEFAULT 0,
  receivables NUMERIC NOT NULL DEFAULT 0,
  loans NUMERIC NOT NULL DEFAULT 0,
  payables NUMERIC NOT NULL DEFAULT 0,
  total_assets NUMERIC NOT NULL DEFAULT 0,
  total_liabilities NUMERIC NOT NULL DEFAULT 0,
  net_wealth NUMERIC NOT NULL DEFAULT 0,
  nisab_amount NUMERIC NOT NULL DEFAULT 0,
  zakat_amount NUMERIC NOT NULL DEFAULT 0,
  is_zakat_due BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zakat_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own zakat calculations"
ON public.zakat_calculations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_zakat_calculations_updated_at
BEFORE UPDATE ON public.zakat_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
