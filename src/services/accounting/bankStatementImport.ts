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

// ── Column Mapping ───────────────────────────────────────────────────────────

export interface FieldMap {
    date?: string;
    value_date?: string | null;
    description?: string;
    reference?: string;
    debit?: string;
    credit?: string;
    amount?: string | null;
    balance?: string;
}

export interface ColumnMapping {
    _id: string;
    name: string;
    bank_name?: string;
    field_map: FieldMap;
    amount_direction_mode: AmountDirectionMode;
    direction_column?: string | null;
    date_format: string;
    skip_rows: number;
    decimal_separator: string;
    thousands_separator: string;
    is_default: boolean;
    shop_id: string;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ColumnMappingInput {
    shop_id: string;
    name: string;
    bank_name?: string;
    field_map?: FieldMap;
    amount_direction_mode?: AmountDirectionMode;
    direction_column?: string | null;
    date_format?: string;
    skip_rows?: number;
    decimal_separator?: string;
    thousands_separator?: string;
    is_default?: boolean;
}

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
    payee_type?: PayeeType;
    payee_id?: string;
    payee_name?: string;
    category_label?: string;
    tags?: string[];
    notes_template?: string;
    exclude?: boolean;
}

export interface CategorizationRule {
    _id: string;
    name: string;
    is_active: boolean;
    priority: number;
    match_type: MatchType;
    conditions: RuleCondition[];
    actions: RuleActions;
    apply_to_existing: boolean;
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
    priority?: number;
    match_type?: MatchType;
    conditions: RuleCondition[];
    actions: RuleActions;
    apply_to_existing?: boolean;
}

// ── Category Mapping ─────────────────────────────────────────────────────────

export interface CategoryMapping {
    _id: string;
    keyword: string;
    match_mode: MatchMode;
    case_sensitive: boolean;
    direction: Direction;
    account_id: string;
    account_code?: string;
    account_name?: string;
    category_label?: string;
    payee_type?: PayeeType;
    payee_id?: string;
    payee_name?: string;
    priority: number;
    is_active: boolean;
    shop_id: string;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryMappingInput {
    shop_id: string;
    keyword: string;
    match_mode?: MatchMode;
    case_sensitive?: boolean;
    direction?: Direction;
    account_id: string;
    category_label?: string;
    payee_type?: PayeeType;
    payee_id?: string;
    payee_name?: string;
    priority?: number;
    is_active?: boolean;
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
    matched_rule_id?: string;
    matched_rule_name?: string;
    matched_keyword?: string;
    categorized_by?: "rule" | "keyword_map" | "manual" | null;
    categorized_at?: string;
    is_duplicate?: boolean;
    pushed_at?: string;
    pushed_to_reconciliation_id?: string;
    pushed_to_statement_line_id?: string;
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
}

export interface BulkCategorizeInput extends CategorizeTransactionInput {
    txn_ids: string[];
}

export interface PushToReconciliationInput {
    reconciliation_id: string;
    txn_ids?: string[];
}

export interface PushToJournalEntriesInput {
    bank_account_id: string;
    txn_ids?: string[];
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

export const getColumnMappings = async (shop_id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/bank-reconciliations/column-mappings`,
        { params: { shop_id } }
    );
    return response.data as { mappings: ColumnMapping[] };
};

export const createColumnMapping = async (data: ColumnMappingInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/column-mappings`,
            data
        );
        message.success("Column mapping created");
        return response.data as { mapping: ColumnMapping };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error creating column mapping");
        }
        throw error;
    }
};

export const updateColumnMapping = async (id: string, data: Partial<ColumnMappingInput>) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bank-reconciliations/column-mappings/${id}`,
            data
        );
        message.success("Column mapping updated");
        return response.data as { mapping: ColumnMapping };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error updating column mapping");
        }
        throw error;
    }
};

export const deleteColumnMapping = async (id: string) => {
    try {
        await axiosInstance.delete(
            `${BASE_URL}/accounting/bank-reconciliations/column-mappings/${id}`
        );
        message.success("Column mapping deleted");
        return true;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error deleting column mapping");
        }
        return false;
    }
};

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

export const deleteCategoryMapping = async (id: string) => {
    try {
        await axiosInstance.delete(
            `${BASE_URL}/accounting/bank-reconciliations/category-mappings/${id}`
        );
        message.success("Category mapping deleted");
        return true;
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error deleting category mapping");
        }
        return false;
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

export const pushToReconciliation = async (id: string, data: PushToReconciliationInput) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/push-to-reconciliation`,
            data
        );
        message.success(`${response.data.pushed_count} transactions pushed to reconciliation`);
        return response.data as {
            pushed_count: number;
            reconciliation_id: string;
        };
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError?.response?.data?.message) {
            message.error(axiosError.response.data.message);
        } else {
            message.error("Error pushing to reconciliation");
        }
        throw error;
    }
};

export const pushToJournalEntries = async (id: string, data: PushToJournalEntriesInput) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/push-to-journal-entries`,
            data
        );
        message.success(`${response.data.pushed_count} journal entries created`);
        return response.data as {
            created_entries: string[];
            pushed_count: number;
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

export const voidImport = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/bank-imports/${id}/void`
        );
        message.success("Import voided");
        return response.data as { message: string };
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