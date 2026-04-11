
-- Make category_id and account_id nullable on transactions
ALTER TABLE public.transactions ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN account_id DROP NOT NULL;

-- Drop existing foreign keys and re-add with CASCADE
-- accounts -> ledgers
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_ledger_id_fkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;

-- categories -> ledgers
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_ledger_id_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;

-- transactions -> ledgers
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_ledger_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;

-- transactions -> accounts (SET NULL on delete since nullable)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- transactions -> categories (SET NULL on delete since nullable)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- grocery_master_items -> ledgers
ALTER TABLE public.grocery_master_items DROP CONSTRAINT IF EXISTS grocery_master_items_ledger_id_fkey;
ALTER TABLE public.grocery_master_items ADD CONSTRAINT grocery_master_items_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;

-- grocery_batches -> ledgers
ALTER TABLE public.grocery_batches DROP CONSTRAINT IF EXISTS grocery_batches_ledger_id_fkey;
ALTER TABLE public.grocery_batches ADD CONSTRAINT grocery_batches_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;

-- grocery_batches -> transactions
ALTER TABLE public.grocery_batches DROP CONSTRAINT IF EXISTS grocery_batches_transaction_id_fkey;
ALTER TABLE public.grocery_batches ADD CONSTRAINT grocery_batches_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- grocery_batch_items -> grocery_batches
ALTER TABLE public.grocery_batch_items DROP CONSTRAINT IF EXISTS grocery_batch_items_batch_id_fkey;
ALTER TABLE public.grocery_batch_items ADD CONSTRAINT grocery_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.grocery_batches(id) ON DELETE CASCADE;

-- grocery_batch_items -> grocery_master_items
ALTER TABLE public.grocery_batch_items DROP CONSTRAINT IF EXISTS grocery_batch_items_master_item_id_fkey;
ALTER TABLE public.grocery_batch_items ADD CONSTRAINT grocery_batch_items_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES public.grocery_master_items(id) ON DELETE SET NULL;

-- zakat_calculations -> ledgers
ALTER TABLE public.zakat_calculations DROP CONSTRAINT IF EXISTS zakat_calculations_ledger_id_fkey;
ALTER TABLE public.zakat_calculations ADD CONSTRAINT zakat_calculations_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE CASCADE;
