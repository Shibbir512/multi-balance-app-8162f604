export interface Ledger {
  id: string;
  name: string;
  user_id: string;
  currency: string;
  created_at: string;
}

export interface Account {
  id: string;
  ledger_id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  ledger_id: string;
  user_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  ledger_id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  note: string | null;
  transfer_to_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryMasterItem {
  id: string;
  ledger_id: string;
  name: string;
  default_unit: string;
  default_quantity: number | null;
  average_interval: number | null;
  last_purchase_date: string | null;
  created_at: string;
}

export interface GroceryBatch {
  id: string;
  ledger_id: string;
  batch_date: string;
  status: "draft" | "completed";
  total_cost: number | null;
  created_at: string;
}

export interface GroceryBatchItem {
  id: string;
  batch_id: string;
  master_item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  is_purchased: boolean;
  created_at: string;
}
