// ============================================
// PESA ACCOUNTING TYPES
// ============================================

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
  _id: string;
  account_code: string;
  account_name: string;
  description?: string;
  account_type: AccountType;
  account_subtype?: string;
  normal_balance: NormalBalance;
  parent_account_id?: string | ChartOfAccount;
  level: number;
  is_parent: boolean;
  current_balance: number;
  opening_balance: number;
  opening_balance_date?: string;
  is_active: boolean;
  is_system_account: boolean;
  is_bank_account: boolean;
  allows_direct_posting: boolean;
  bank_details?: {
    bank_name?: string;
    account_number?: string;
    branch?: string;
    currency?: string;
  };
  pos_mapping?: {
    order_types?: string[];
    payment_method_name?: string;
  };
  shop_id: string;
  created_by?: string;
  updated_by?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountTreeNode extends ChartOfAccount {
  children: AccountTreeNode[];
}

export interface AccountTree {
  ASSET: AccountTreeNode[];
  LIABILITY: AccountTreeNode[];
  EQUITY: AccountTreeNode[];
  REVENUE: AccountTreeNode[];
  EXPENSE: AccountTreeNode[];
}

export interface LedgerLine {
  entry_no: string;
  entry_date: string;
  description: string;
  reference?: string;
  source: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountLedgerResponse {
  account: {
    account_code: string;
    account_name: string;
    account_type: AccountType;
    opening_balance: number;
    opening_running_balance: number;
    normal_balance: NormalBalance;
  };
  ledger: LedgerLine[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface GetAccountsParams {
  shop_id: string;
  account_type?: AccountType;
  account_subtype?: string;
  is_active?: boolean;
  is_bank_account?: boolean;
  allows_direct_posting?: boolean;
  search?: string;
}

export interface CreateAccountParams {
  shop_id: string;
  account_code?: string;
  auto_generate_code?: boolean;
  account_name: string;
  account_type: AccountType;
  account_subtype?: string;
  description?: string;
  parent_account_id?: string;
  level?: number;
  normal_balance?: NormalBalance;
  opening_balance?: number;
  opening_balance_date?: string;
  is_bank_account?: boolean;
  allows_direct_posting?: boolean;
  bank_details?: {
    bank_name?: string;
    account_number?: string;
    branch?: string;
    currency?: string;
  };
  pos_mapping?: {
    order_types?: string[];
    payment_method_name?: string;
  };
}

// ── Journal Entries ──────────────────────────────────────────────────────────

export type JournalEntryStatus = 'Draft' | 'Posted' | 'Voided';
export type JournalEntrySource =
  | 'manual'
  | 'journal'
  | 'pos_sale'
  | 'pos_subscription'
  | 'invoice'
  | 'bill'
  | 'payment'
  | 'reconciliation'
  | 'bank_upload'
  | 'income'
  | 'expense'
  | 'payroll'
  | 'credit_note'
  | 'debit_note'
  | 'note_void';

export interface JournalLine {
  _id?: string;
  account_id: string | { _id: string; account_code: string; account_name: string; account_type: string };
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  customer_id?: string;
  supplier_id?: string;
}

export interface JournalEntry {
  _id: string;
  entry_no: string;
  entry_date: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  status: JournalEntryStatus;
  posted_at?: string;
  posted_by?: string | { _id: string; username: string; name: string };
  voided_at?: string;
  voided_by?: string | { _id: string; username: string; name: string };
  source?: JournalEntrySource;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'Draft'
  | 'Pending'
  | 'Partially_Paid'
  | 'Paid'
  | 'Overdue'
  | 'Voided'
  | 'Cancelled';

export type InvoiceSource = 'pos' | 'accounting' | 'standalone';
export type InvoiceDirection = 'customer' | 'supplier';

export interface DigiTaxData {
  sale_id?: string;
  serial_number?: string;
  receipt_number?: number;
  invoice_number?: number;
  trader_invoice_number?: string;
  etims_url?: string;
  offline_url?: string;
  receipt_signature?: string;
  internal_data?: string;
  receipt_type_code?: string;
  sale_date?: string;
  sale_time?: string;
  submission_status?: 'Pending' | 'Submitted' | 'Verified' | 'COMPLETED' | 'Failed' | 'FAILED';
  submission_date?: string;
  error_message?: string | null;
}

export interface InvoiceAttachment {
  url: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

export interface InvoiceLineItem {
  _id?: string;
  description?: string;
  product_id?: string | { _id: string; name: string };
  account_id?: string | { _id: string; account_code: string; account_name: string };
  quantity: number;
  price: number;
  discount_amount?: number;
  vat_type?: 'STANDARD' | 'ZERO' | 'EXEMPT';
  vat_rate?: number;
  vat_amount?: number;
}

export interface InvoicePaymentRef {
  _id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
}

export interface Invoice {
  _id: string;
  invoice_number: string;
  direction: InvoiceDirection;
  source: InvoiceSource;
  customer_id?: string | { _id: string; customer_name: string; email?: string; phone?: string };
  supplier_id?: string | { _id: string; name: string; email?: string; phone?: string };
  issue_date: string;
  due_date: string;
  currency: string;
  lines: InvoiceLineItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  attachments?: InvoiceAttachment[];
  digitax_data?: DigiTaxData;
  payments?: InvoicePaymentRef[];
  shop_id: string;
  createdAt: string;
  updatedAt: string;
}

// ── Banking & Statements ─────────────────────────────────────────────────────

export type ImportStatus = 'Processing' | 'Review' | 'Partially Pushed' | 'Fully Pushed' | 'Voided';
export type TransactionStatus = 'Uncategorized' | 'Categorized' | 'Excluded' | 'Pushed';
export type MatchMode = 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
export type MatchType = 'all' | 'any';
export type AmountDirectionMode = 'sign' | 'column' | 'split';
export type Direction = 'debit' | 'credit' | 'both';
export type PayeeType = 'customer' | 'supplier' | null;
export type ConditionField = 'description' | 'reference' | 'amount' | 'debit' | 'credit' | 'direction';
export type ConditionOperator =
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'regex' | 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'is';
export type ApplyTo = 'deposits' | 'withdrawals';
export type TransactionHandling = 'recognized' | 'categorized';
export type RecordType = 'transfer' | 'income' | 'expense' | 'refund' | null;
export type AssociateAccounts = 'all_accounts' | 'all_banks' | 'all_cards' | 'custom';

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value?: string;
  value2?: string;
  case_sensitive?: boolean;
}

export interface RuleActions {
  account_id?: string;
  account_code?: string;
  account_name?: string;
  record_type?: RecordType;
  target_account_id?: string;
  target_account_code?: string;
  target_account_name?: string;
}

export interface CategorizationRule {
  _id: string;
  name: string;
  is_active: boolean;
  match_type: MatchType;
  conditions: RuleCondition[];
  actions: RuleActions;
  apply_to_existing: boolean;
  apply_to?: ApplyTo;
  transaction_handling?: TransactionHandling;
  auto_categorize?: boolean;
  associate_accounts?: AssociateAccounts;
  associated_account_id?: string | string[];
  vendor_id?: string;
  vat_treatment?: string;
  tax?: string;
  shop_id: string;
}

export interface BankTransaction {
  _id: string;
  date: string;
  description: string;
  reference?: string;
  amount: number;
  direction: 'debit' | 'credit';
  status: TransactionStatus;
  category_account_id?: string | ChartOfAccount;
  matched_record_id?: string;
  shop_id: string;
}

export interface BankStatementImport {
  _id: string;
  filename: string;
  bank_account_id: string | ChartOfAccount;
  import_date: string;
  total_transactions: number;
  categorized_count: number;
  pushed_count: number;
  status: ImportStatus;
  shop_id: string;
}
