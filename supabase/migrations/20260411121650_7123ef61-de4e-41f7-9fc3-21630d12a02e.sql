
CREATE TABLE public.grocery_master_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'কেজি',
  default_quantity NUMERIC NOT NULL DEFAULT 1,
  last_purchase_date DATE,
  average_interval INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grocery_master_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own grocery master items" ON public.grocery_master_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_grocery_master_ledger ON public.grocery_master_items(ledger_id);
CREATE TRIGGER update_grocery_master_items_updated_at BEFORE UPDATE ON public.grocery_master_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.grocery_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grocery_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own grocery batches" ON public.grocery_batches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_grocery_batches_ledger ON public.grocery_batches(ledger_id);
CREATE TRIGGER update_grocery_batches_updated_at BEFORE UPDATE ON public.grocery_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.grocery_batch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.grocery_batches(id) ON DELETE CASCADE,
  master_item_id UUID REFERENCES public.grocery_master_items(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'কেজি',
  quantity NUMERIC NOT NULL DEFAULT 1,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grocery_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own grocery batch items" ON public.grocery_batch_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_grocery_batch_items_batch ON public.grocery_batch_items(batch_id);
