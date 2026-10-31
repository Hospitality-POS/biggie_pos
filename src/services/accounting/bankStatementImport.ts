import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type ImportStatus = "Processing" | "Review" | "Partially Pushed" | "Fully Pushed" | "Voided";
export type TransactionStatus = "Uncategorized" | "Categorized" | "Excluded" | "Pushed";
export type MatchMode = "contains" | "starts_with" | "ends_with" | "exact" | "regex";
export type MatchType = "all" | "any";
export type AmountDirectionMode = "sign" | "column" | "split";
export type Direction = "debit" | "credit" | "both";
export type PayeeType = "customer" | "supplier" | null;
export type ConditionField = "description" | "reference" | "amount" | "debit" | "credit" | "direction";
export type ConditionOperator =
    | "contains" | "not_contains" | "starts_with" | "ends_with"
    | "regex" | "equals" | "gt" | "gte" | "lt" | "lte" | "between" | "is";
export type ApplyTo = "deposits" | "withdrawals";
export type TransactionHandling = "recognized" | "categorized";
export type RecordType = "transfer" | "income" | "expense" | "refund" | null;
export type AssociateAccounts = "all_accounts" | "all_banks" | "all_cards" | "custom";

// ── Categorization Rule ──────────────────────────────────────────────────────

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
    tax_exemption_reason?: string;
    reference_number?: string;
    custom_reference?: string;
    reporting_tags?: string[];
    shop_id: string;
    match_count: number;
    last_matched_at?: string;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategorizationRuleInput {
    shop_id: string;
    name: string;
    is_active?: boolean;
    match_type?: MatchType;
    conditions: RuleCondition[];
    actions: RuleActions;
    apply_to_existing?: boolean;
    apply_to?: ApplyTo;
    transaction_handling?: TransactionHandling;
    auto_categorize?: boolean;
    associate_accounts?: AssociateAccounts;
    associated_account_id?: string | string[];
    vendor_id?: string;
    vat_treatment?: string;
    tax?: string;
    tax_exemption_reason?: string;
    reference_number?: string;
    custom_reference?: string;
    reporting_tags?: string[];
}

// ── Raw Transaction ──────────────────────────────────────────────────────────

export interface RawTransaction {
    _id: string;
    row_index: number;
    transaction_date: string;
    value_date?: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    original_amount?: number;
    running_balance?: number;
    status: TransactionStatus;
    account_id?: string;
    account_code?: string;
    account_name?: string;
    category_label?: string;
    tags?: string[];
    payee_type?: PayeeType;
    payee_id?: string;
    payee_name?: string;
    notes?: string;
    record_type?: RecordType;
    target_account_id?: string;
    target_account_code?: string;
    target_account_name?: string;
    matched_rule_id?: string;
    matched_rule_name?: string;
    matched_keyword?: string;
    categorized_by?: "rule" | "keyword_map" | "manual" | null;
    categorized_at?: string;
    is_duplicate?: boolean;
    /** Entered by hand in the review screen rather than parsed from the file */
    is_manual?: boolean;
    pushed_at?: string;
    journal_entry_id?: string;
    pushed_to_reconciliation_id?: string;
    pushed_to_statement_line_id?: string;
    allocations?: TransactionAllocation[];
    payment_method_id?: string | null;
    splits?: TransactionSplit[];
}

/** One account's share of a transaction's (unlinked) category amount. */
export interface TransactionSplit {
    account_id: string;
    account_code?: string;
    account_name?: string;
    amount: number;
    description?: string;
}

// ── Invoice / bill links ─────────────────────────────────────────────────────
// Money in links to customer invoices, money out to supplier bills.

export type LinkDocType = "invoice" | "bill";

export interface TransactionAllocation {
    doc_type: LinkDocType;
    doc_id: string;
    doc_no?: string;
    party_name?: string;
    amount: number;
    payment_id?: string | null;
}

export interface LinkableDocument {
    doc_type: LinkDocType;
    doc_id: string;
    doc_no: string;
    party_name: string;
    date?: string;
    due_date?: string;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    status: string;
    exact_match: boolean;
}

// ── Bank Statement Import ────────────────────────────────────────────────────

export interface BankStatementImport {
    _id: string;
    import_no: string;
    account_id: string | { _id: string; account_code: string; account_name: string; account_type: string };
    account_code?: string;
    account_name?: string;
    source_type: "excel" | "csv" | "manual" | "pdf";
    original_filename?: string;
    column_mapping_id?: string;
    statement_from?: string;
    statement_to?: string;
    opening_balance: number;
    closing_balance: number;
    amount_column_type?: "double" | "single";
    transactions: RawTransaction[];
    total_rows: number;
    imported_rows: number;
    skipped_rows: number;
    duplicate_rows: number;
    error_rows: number;
    total_debits: number;
    total_credits: number;
    categorized_count: number;
    uncategorized_count: number;
    excluded_count: number;
    pushed_count: number;
    status: ImportStatus;
    rules_applied_at?: string;
    rules_applied_count?: number;
    import_errors?: { row: number; message: string }[];
    notes?: string;
    shop_id: string;
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;
}

// ── PDF Upload Response ──────────────────────────────────────────────────────

export interface PDFParseResponse {
    message: string;
    import_no: string;
    import_id: string;
    total_transactions: number;
    auto_categorized: number;
    uncategorized: number;
    file_parsed: boolean;
    parsed_transactions: number;
    original_filename: string;
    statement_from?: string;
    statement_to?: string;
    opening_balance?: number;
    closing_balance?: number;
}

// ── Params & Inputs ──────────────────────────────────────────────────────────

export interface GetImportsParams {
    shop_id: string;
    account_id?: string;
    status?: ImportStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface GetImportByIdParams {
    status_filter?: TransactionStatus;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
}

export interface ImportStatementInput {
    shop_id: string;
    account_id: string;
    source_type?: "excel" | "csv" | "manual" | "pdf";
    original_filename?: string;
    column_mapping_id?: string;
    statement_from?: string;
    statement_to?: string;
    opening_balance?: number;
    closing_balance?: number;
    amount_column_type?: "double" | "single";
    date_format?: string;
    transactions: Partial<RawTransaction>[];
    notes?: string;
}

export interface CategorizeTransactionInput {
    account_id: string;
    account_code?: string;
    account_name?: string;
    category_label?: string;
    tags?: string[];
    payee_type?: PayeeType;
    payee_id?: string;
    payee_name?: string;
    notes?: string;
    record_type?: RecordType;
    target_account_id?: string;
    target_account_code?: string;
    target_account_name?: string;
    /** Two or more lines splitting the category amount; [] removes a split. */
    splits?: Pick<TransactionSplit, "account_id" | "amount" | "description">[];
}

export interface BulkCategorizeInput extends CategorizeTransactionInput {
    txn_ids: string[];
}

export interface PushToJournalEntriesInput {
    bank_account_id: string;
    txn_ids?: string[];
}

export type UnpostedReason =
    | "not_categorized"
    | "not_posted"
    | "missing_journal_entry"
    | "journal_entry_deleted"
    | "journal_entry_voided"
    // The entry exists but won't show in this bank account's ledger as expected
    | "journal_entry_draft"
    | "not_on_bank_account"
    | "amount_mismatch"
    | "different_branch"
    | "date_differs";

/** Reasons a re-post fixes — the others need the existing entry corrected. */
export const REPOSTABLE_REASONS: UnpostedReason[] = [
    "not_posted",
    "missing_journal_entry",
    "journal_entry_deleted",
    "journal_entry_voided",
];

export const UNPOSTED_REASON_LABELS: Record<UnpostedReason, { label: string; color: string; hint: string }> = {
    not_categorized: { label: "Not Categorized", color: "warning", hint: "Pick an account, then complete it" },
    not_posted: { label: "Not Posted", color: "warning", hint: "Categorized but never completed" },
    missing_journal_entry: { label: "Missing Journal Entry", color: "error", hint: "Marked completed, but no journal entry exists — re-post it" },
    journal_entry_deleted: { label: "Journal Entry Deleted", color: "error", hint: "Its journal entry was deleted — re-post it" },
    journal_entry_voided: { label: "Journal Entry Voided", color: "error", hint: "Its journal entry was voided — re-post it" },
    journal_entry_draft: { label: "Entry Still Draft", color: "orange", hint: "Draft entries don't show in the ledger — post the entry" },
    not_on_bank_account: { label: "Not On This Bank", color: "orange", hint: "The entry has no line on this statement's bank account" },
    amount_mismatch: { label: "Amount Differs", color: "orange", hint: "The entry's bank line doesn't match the statement amount" },
    different_branch: { label: "Other Branch", color: "orange", hint: "The entry belongs to a different branch, so a branch-filtered ledger hides it" },
    date_differs: { label: "Date Differs", color: "gold", hint: "The entry date differs from the statement date and may fall outside the ledger period" },
};

export interface UnpostedTransaction {
    _id: string;
    description: string;
    reference?: string;
    transaction_date: string;
    debit: number;
    credit: number;
    status: TransactionStatus;
    account_id?: string;
    account_code?: string;
    account_name?: string;
    journal_entry_id?: string | null;
    journal_entry_no?: string | null;
    entry_date?: string | null;
    reason: UnpostedReason;
}

export interface VerifyPostingResult {
    import_id: string;
    import_no: string;
    total_checked: number;
    posted_count: number;
    unposted_count: number;
    all_posted: boolean;
    unposted: UnpostedTransaction[];
}

export interface ReApplyRulesInput {
    reset_categorized?: boolean;
}

export interface UploadStatementInput {
    shop_id: string;
    account_id?: string;
    bank_format?: string;
}

// ============================================
// COLUMN MAPPING SERVICES
// ============================================

// ============================================
// CATEGORIZATION RULE SERVICES
// ============================================

export const getCategorizationRules = async (shop_id: string, is_active?: boolean) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/categorization-rules`,
        { params: { shop_id, is_active } }
    );
    return response.data as { rules: CategorizationRule[] };
};

export const createCategorizationRule = async (data: CategorizationRuleInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/categorization-rules`,
            data
        );
        message.success("Categorization rule created");
        return response.data as { rule: CategorizationRule };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error creating categorization rule");
        }
        throw error;
    }
};

export const updateCategorizationRule = async (id: string, data: Partial<CategorizationRuleInput>) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bank-reconciliations/categorization-rules/${id}`,
            data
        );
        message.success("Categorization rule updated");
        return response.data as { rule: CategorizationRule };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error updating categorization rule");
        }
        throw error;
    }
};

export const deleteCategorizationRule = async (id: string) => {
    try {
        await axiosInstance.delete(
            `${BASE_URL}/accounting/bank-reconciliations/categorization-rules/${id}`
        );
        message.success("Categorization rule deleted");
        return true;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error deleting categorization rule");
        }
        return false;
    }
};

// ── Category Mapping ───────────────────────────────────────────────────────────

export interface CategoryMapping {
    _id: string;
    shop_id?: string;
    pattern?: string;
    account_id?: string;
    account_code?: string;
    account_name?: string;
    is_active?: boolean;
    [key: string]: any;
}

export interface CategoryMappingInput {
    shop_id?: string;
    pattern?: string;
    account_id?: string;
    account_code?: string;
    account_name?: string;
    is_active?: boolean;
    [key: string]: any;
}

// ============================================
// CATEGORY MAPPING SERVICES
// ============================================

export const getCategoryMappings = async (shop_id: string, is_active?: boolean) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/category-mappings`,
        { params: { shop_id, is_active } }
    );
    return response.data as { mappings: CategoryMapping[] };
};

export const createCategoryMapping = async (data: CategoryMappingInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/category-mappings`,
            data
        );
        message.success("Category mapping created");
        return response.data as { mapping: CategoryMapping };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error creating category mapping");
        }
        throw error;
    }
};

export const updateCategoryMapping = async (id: string, data: Partial<CategoryMappingInput>) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bank-reconciliations/category-mappings/${id}`,
            data
        );
        message.success("Category mapping updated");
        return response.data as { mapping: CategoryMapping };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error updating category mapping");
        }
        throw error;
    }
};

// ============================================
// TEMPLATE DOWNLOAD SERVICES
// ============================================

/**
 * Download Excel template for bank statement import
 * @param account_id - The bank account ID to generate template for
 */
export const downloadExcelTemplate = async (account_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/template/excel`,
            {
                params: { account_id },
                responseType: 'blob',
            }
        );
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'bank_statement_template.xlsx');
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
        
        message.success('Excel template downloaded successfully');
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error('Error downloading Excel template');
        }
        throw error;
    }
};

/**
 * Download PDF template for bank statement import
 * @param account_id - The bank account ID to generate template for
 */
export const downloadPDFTemplate = async (account_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/template/pdf`,
            {
                params: { account_id },
                responseType: 'blob',
            }
        );
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'bank_statement_template.pdf');
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
        
        message.success('PDF template downloaded successfully');
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error('Error downloading PDF template');
        }
        throw error;
    }
};

// ============================================
// BANK STATEMENT IMPORT SERVICES
// ============================================

export const getAllImports = async (params: GetImportsParams) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/bank-imports`,
        { params }
    );
    return response.data as {
        imports: BankStatementImport[];
        totalPages: number;
        currentPage: number;
        total: number;
    };
};

export const getImportById = async (id: string, params?: GetImportByIdParams) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}`,
        { params }
    );
    return response.data as {
        import: BankStatementImport;
        transaction_total: number;
        totalPages: number;
        currentPage: number;
    };
};

export const getImportSummary = async (shop_id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/bank-imports/summary`,
        { params: { shop_id } }
    );
    return response.data as {
        by_status: Record<string, { count: number; total_txns: number; uncategorized: number; categorized: number }>;
        by_account: { _id: string; account_name: string; account_code: string; import_count: number; total_txns: number; pending_categorization: number }[];
    };
};

export const importStatement = async (data: ImportStatementInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports`,
            data
        );
        message.success("Statement imported successfully");
        return response.data as {
            import_no: string;
            import_id: string;
            total_transactions: number;
            auto_categorized: number;
            uncategorized: number;
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error importing statement");
        }
        throw error;
    }
};

// ── Compare / Reconcile ──────────────────────────────────────────────────────

export interface CompareStatementInput {
    shop_id: string;
    account_id: string;
    transactions: {
        transaction_date: string;
        description?: string;
        reference?: string;
        debit: number;
        credit: number;
    }[];
}

export interface CompareStatementRow {
    row_index?: number;
    transaction_date: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    matched_import_no?: string;
    import_no?: string;
}

export interface CompareStatementResult {
    account_id: string;
    uploaded_count: number;
    system_count: number;
    matched_count: number;
    missing_in_system: CompareStatementRow[];
    missing_in_system_count: number;
    missing_in_upload: CompareStatementRow[];
    missing_in_upload_count: number;
    totals: {
        uploaded_debits: number;
        uploaded_credits: number;
        system_debits: number;
        system_credits: number;
        missing_in_system_debits: number;
        missing_in_system_credits: number;
        missing_in_upload_debits: number;
        missing_in_upload_credits: number;
    };
}

/**
 * Re-upload a statement and diff it against everything already imported for
 * this account, to find transactions that are missing from the system
 * (not yet imported) or missing from the upload (already imported but not
 * present in this file).
 */
export const compareStatement = async (data: CompareStatementInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/compare`,
            data
        );
        return response.data as CompareStatementResult;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error comparing statement");
        }
        throw error;
    }
};

// ============================================
// NEW: PDF UPLOAD & PARSE SERVICE
// ============================================

/**
 * Upload and parse a bank statement file (PDF or Excel)
 * @param formData - FormData containing file, shop_id, account_id, bank_format
 */
export const uploadAndParseStatement = async (formData: FormData) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    // You can track upload progress here if needed
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    // Store or emit progress as needed
                    console.log('Upload progress:', percentCompleted);
                },
            }
        );

        if (response.data.message) {
            message.success(response.data.message);
        }

        return response.data as PDFParseResponse;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else if (axiosError?.message) {
            message.error(`Upload failed: ${axiosError.message}`);
        } else {
            message.error("Error parsing and importing statement");
        }
        throw error;
    }
};

/**
 * Upload only (without auto-import) for preview purposes
 * @param formData - FormData containing file, shop_id, bank_format
 */
export const previewBankStatement = async (formData: FormData) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/preview`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error previewing statement");
        }
        throw error;
    }
};

// ============================================
// EXISTING SERVICES (continued)
// ============================================

export const reApplyRules = async (id: string, data?: ReApplyRulesInput) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/re-apply-rules`,
            data || {}
        );
        message.success(response.data.message || "Rules re-applied successfully");
        return response.data as {
            auto_categorized: number;
            uncategorized: number;
            categorized: number;
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error re-applying rules");
        }
        throw error;
    }
};

export const categorizeTransaction = async (
    id: string,
    txn_id: string,
    data: CategorizeTransactionInput
) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/${txn_id}/categorize`,
            data
        );
        message.success("Transaction categorized");
        return response.data as { transaction: RawTransaction };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error categorizing transaction");
        }
        throw error;
    }
};

export const bulkCategorize = async (id: string, data: BulkCategorizeInput) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/bulk-categorize`,
            data
        );
        message.success(response.data.message || "Transactions categorized");
        return response.data as {
            categorized: number;
            uncategorized: number;
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error bulk categorizing transactions");
        }
        throw error;
    }
};

export const excludeTransaction = async (id: string, txn_id: string, notes?: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/${txn_id}/exclude`,
            { notes }
        );
        message.success(response.data.message);
        return response.data as { transaction: RawTransaction };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error excluding transaction");
        }
        throw error;
    }
};

export const getLinkableDocuments = async (params: { type: LinkDocType; search?: string; amount?: number }) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/bank-imports/linkable-documents`,
        { params }
    );
    return (response.data?.documents || []) as LinkableDocument[];
};

export const linkTransaction = async (
    id: string,
    txn_id: string,
    data: { allocations: Pick<TransactionAllocation, "doc_type" | "doc_id" | "amount">[]; payment_method_id?: string | null }
) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/${txn_id}/allocations`,
            data
        );
        message.success(response.data.message);
        if (response.data.warning) message.warning(response.data.warning);
        return response.data as { transaction: RawTransaction; applied: boolean };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError?.response?.data?.message || "Error linking transaction");
        throw error;
    }
};

export const uncategorizeTransaction = async (id: string, txn_id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/${txn_id}/uncategorize`
        );
        message.success("Transaction uncategorized");
        return response.data as { transaction: RawTransaction };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error uncategorizing transaction");
        }
        throw error;
    }
};

export const pushToJournalEntries = async (id: string, data: PushToJournalEntriesInput, silent = false) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/push-to-journal-entries`,
            data
        );
        if (!silent) {
            message.success(
                response.data.message ||
                    `${response.data.pushed_count} journal entries created`
            );
        }
        const linkErrors: { description: string; reason: string }[] = response.data.link_errors || [];
        if (linkErrors.length) {
            message.warning(
                `Invoice/bill links not applied: ${linkErrors.map((e) => `${e.description} — ${e.reason}`).join("; ")}`,
                8
            );
        }
        return response.data as {
            created_entries: string[];
            pushed_count: number;
            already_posted?: number;
            link_errors?: { txn_id: string; description: string; reason: string }[];
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error pushing to journal entries");
        }
        throw error;
    }
};

export const verifyPosting = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/verify-posting`
        );
        return response.data as VerifyPostingResult;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error verifying posting status");
        }
        throw error;
    }
};

export const voidImport = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/void`
        );
        const data = response.data as { message: string; voided_journal_entries?: number };
        message.success(
            data.voided_journal_entries
                ? `Import voided — ${data.voided_journal_entries} journal entr${data.voided_journal_entries === 1 ? "y" : "ies"} voided`
                : "Import voided"
        );
        return data;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error voiding import");
        }
        throw error;
    }
};

export const deleteImport = async (id: string) => {
    try {
        const response = await axiosInstance.delete(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}`
        );
        message.success("Import deleted");
        return response.data as { message: string };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error deleting import");
        }
        throw error;
    }
};

// ── Smart Assist ─────────────────────────────────────────────────────────────

/** A suggested account for an uncategorized line. */
export interface AssistSuggestion {
    txn_id: string;
    account_id: string;
    account_code?: string;
    account_name?: string;
    /** 0–100 */
    confidence: number;
    /** history = learned from earlier categorizations; ai = asked the AI */
    source: "history" | "ai";
    based_on: number;
    disagreeing?: number;
    reason?: string;
    examples: { date: string; description: string; amount: number }[];
    /** The line being suggested for */
    txn: { date: string; description: string; amount: number; direction: "debit" | "credit" } | null;
}

export interface AssistPattern {
    key: string;
    label: string;
    direction: "debit" | "credit";
    count: number;
    months: number;
    in_this_import: number;
    uncategorized_here: number;
    cadence: { label: string; days: number } | null;
    typical_amount: number;
    min_amount: number;
    max_amount: number;
    last_seen: string;
    top_account: { account_id: string; account_code?: string; account_name?: string; n: number; share: number } | null;
    consistency: number | null;
    covered_by_rule: { _id: string; name: string } | null;
    suggested_rule: {
        name: string;
        match_type: MatchType;
        apply_to: ApplyTo;
        conditions: RuleCondition[];
        actions: RuleActions;
    } | null;
    sample_descriptions: string[];
}

export interface AssistWatchout {
    type: "unusual_amount" | "duplicate" | "missing_recurring";
    severity: "high" | "medium" | "low";
    txn_id?: string;
    related_txn_id?: string;
    title: string;
    detail: string;
}

export interface ImportAssist {
    summary: {
        uncategorized: number;
        suggested: number;
        high_confidence: number;
        without_history: number;
        history_lines: number;
        patterns: number;
        rules_to_create: number;
        watchouts: number;
    };
    suggestions: AssistSuggestion[];
    patterns: AssistPattern[];
    watchouts: AssistWatchout[];
    ai: { available: boolean; used: boolean; error: string | null };
    generated_at: string;
}

/** Suggestions, recurring patterns and watch-outs; ai also asks the AI about lines with no history. */
export const getImportAssist = async (id: string, opts: { ai?: boolean } = {}) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/assist`,
        { params: opts.ai ? { ai: 1 } : {} }
    );
    return response.data as ImportAssist;
};

export interface AddTransactionInput {
    transaction_date: string;
    description: string;
    reference?: string;
    direction: "in" | "out";
    amount: number;
    /** Categorizes the transaction straight away when given */
    account_id?: string;
    notes?: string;
}

export const addTransaction = async (id: string, data: AddTransactionInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions`,
            data
        );
        message.success(response.data.message);
        return response.data as { message: string; transaction: RawTransaction };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error adding transaction");
        }
        throw error;
    }
};

export const deleteTransactions = async (id: string, txn_ids: string[]) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/transactions/delete`,
            { txn_ids }
        );
        message.success(response.data.message);
        return response.data as { message: string; deleted: number };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error deleting transactions");
        }
        throw error;
    }
};