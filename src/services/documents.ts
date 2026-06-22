import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const documentUrl = `${BASE_URL}/documents`;

const { headers } = SetBearerHeaderToken();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentType =
    | "folder"
    | "cheque"
    | "quotation"
    | "invoice"
    | "receipt"
    | "purchase_order"
    | "delivery_note"
    | "credit_note"
    | "contract"
    | "other";

export type DocumentStatus =
    // General
    | "draft"
    | "active"
    | "archived"
    | "cancelled"
    // Cheque
    | "cheque_received"
    | "cheque_pending"
    | "cheque_processed"
    | "cheque_bounced"
    | "cheque_cancelled"
    // Financial
    | "sent"
    | "approved"
    | "rejected"
    | "paid"
    | "partially_paid"
    | "overdue"
    | "fulfilled";

export type SearchMode = "normal" | "ai";

export interface DocumentMeta {
    // Cheque fields
    cheque_number?: string;
    bank_name?: string;
    account_number?: string;
    drawer_name?: string;
    payee_name?: string;
    bounce_reason?: string;
    // Financial shared
    reference_number?: string;
    issue_date?: string;
    due_date?: string;
    processed_date?: string;
    delivered_date?: string;
    expected_delivery_date?: string;
    delivery_address?: string;
    supplier_name?: string;
    payment_terms?: string;
    notes?: string;
    currency?: string;
    // Amounts
    amount?: number;
    subtotal?: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount?: number;
    amount_paid?: number;
    balance_due?: number;
    // Line items
    line_items?: Array<{
        description?: string;
        quantity?: number;
        unit_price?: number;
        tax_rate?: number;
        total?: number;
    }>;
    related_document_id?: string;
}

export interface Counterparty {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    ref_id?: string;
    ref_model?: string;
}

export interface DocumentAttachment {
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
}

export interface DocumentRecord {
    _id: string;
    code: string;
    name: string;
    description?: string;
    document_type: DocumentType;
    status: DocumentStatus;
    parent_id?: string | null;
    path?: string;
    depth?: number;
    customer_id?: string | null;
    is_customer_root_folder?: boolean;
    attachments?: DocumentAttachment[];
    counterparty?: Counterparty;
    meta?: DocumentMeta;
    shop_id?: string;
    tenant_id?: string;
    created_by?: string;
    updated_by?: string;
    is_deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
    /** AI search only — cosine similarity score (0–1) */
    _similarity?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    current: number;
    pageSize: number;
    total_pages?: number;
    success: boolean;
}

export interface SearchFacets {
    by_type: Array<{ _id: string; count: number }>;
    by_status: Array<{ _id: string; count: number }>;
    amount_summary: {
        total_amount: number;
        avg_amount: number;
        max_amount?: number;
        min_amount?: number;
    } | null;
}

export interface SearchResponse extends PaginatedResponse<DocumentRecord> {
    facets: SearchFacets;
    query_summary?: string;
    /** Which engine actually ran: "ai" | "normal" | "fallback_normal" */
    search_mode: SearchMode | "fallback_normal";
    /** Present when mode=ai was requested but key was missing */
    fallback_reason?: string;
    /** AI search only */
    query?: string;
    threshold?: number;
}

export interface SearchParams {
    /** Free-text query */
    q?: string;
    /**
     * Search engine to use.
     *  "normal" (default) — fast regex/aggregation, always available.
     *  "ai"               — OpenAI semantic search (requires embeddings on documents).
     */
    mode?: SearchMode;
    /** Minimum cosine similarity for AI search results (0–1, default 0.35) */
    threshold?: number;
    /** Single type or comma-separated: "cheque,invoice" */
    document_type?: string;
    /** Single status or comma-separated: "cheque_received,cheque_pending" */
    status?: string;
    customer_id?: string;
    shop_id?: string;
    /** Restrict search to documents inside this folder and all its sub-folders */
    parent_id?: string;
    /** Pass "true" to include folder records in results */
    include_folders?: "true" | "false";
    /** "true" | "false" — filter by whether the document has attachments */
    has_attachments?: "true" | "false";
    amount_min?: number;
    amount_max?: number;
    date_field?: "createdAt" | "issue_date" | "due_date" | "processed_date";
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    current?: number;
    pageSize?: number;
}

export interface EmbedBatchParams {
    batchSize?: number;
    shop_id?: string;
}

export interface EmbedBatchResponse {
    message: string;
    total_processed: number;
    success: number;
    failed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getShopId = (): string | null => localStorage.getItem("shopId");

/**
 * Build a FormData object for requests that include file attachments.
 * Non-file values are stringified if they are objects/arrays.
 */
const buildFormData = (fields: Record<string, any>, files?: File[]): FormData => {
    const formData = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (typeof value === "object" && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });

    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append("attachments", file, file.name);
        });
    }

    return formData;
};

// ─────────────────────────────────────────────────────────────────────────────
// FOLDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new folder. Pass parent_id to nest it inside another folder.
 */
export const createFolder = async (params: {
    name: string;
    description?: string;
    parent_id?: string | null;
    customer_id?: string | null;
    shop_id?: string;
}): Promise<DocumentRecord> => {
    try {
        const response = await axiosInstance.post(`${documentUrl}/folders`, {
            ...params,
            shop_id: params.shop_id || getShopId(),
        }, { headers });
        return response.data.folder;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to create folder");
        throw error;
    }
};

/**
 * List folders. If parent_id is provided, returns children of that folder.
 * Omit parent_id to get root-level folders.
 */
export const getFolders = async (params?: {
    parent_id?: string | null;
    shop_id?: string;
    customer_id?: string;
}): Promise<DocumentRecord[]> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/folders`, {
            headers,
            params: { shop_id: getShopId(), ...params },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch folders");
    }
};

/**
 * Get a folder and its entire nested subtree (all descendants).
 */
export const getFolderTree = async (folderId: string): Promise<{
    root: DocumentRecord;
    descendants: DocumentRecord[];
}> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/folders/${folderId}/tree`, { headers });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch folder tree");
    }
};

/**
 * Rename or move a folder to a different parent.
 */
export const updateFolder = async (
    folderId: string,
    params: { name?: string; description?: string; parent_id?: string | null }
): Promise<DocumentRecord> => {
    try {
        const response = await axiosInstance.put(`${documentUrl}/folders/${folderId}`, params, { headers });
        // message.success("Folder updated successfully");
        return response.data.folder;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to update folder");
        throw error;
    }
};

/**
 * Soft-delete a folder and all its contents.
 */
export const deleteFolder = async (folderId: string): Promise<void> => {
    try {
        await axiosInstance.delete(`${documentUrl}/folders/${folderId}`, { headers });
        // message.success("Folder deleted successfully");
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to delete folder");
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER FOLDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create the root folder for a customer.
 * Safe to call on every customer page load — will never create duplicates.
 */
export const getOrCreateCustomerFolder = async (
    customerId: string,
    customerName: string
): Promise<DocumentRecord> => {
    try {
        const response = await axiosInstance.post(
            `${documentUrl}/customers/${customerId}/folder`,
            { customer_name: customerName, shop_id: getShopId() },
            { headers }
        );
        return response.data.folder;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to get customer folder");
        throw error;
    }
};

/**
 * Get all documents belonging to a customer.
 * Optionally filter by type and/or status.
 */
export const getCustomerDocuments = async (
    customerId: string,
    params?: {
        document_type?: DocumentType;
        status?: DocumentStatus;
        shop_id?: string;
    }
): Promise<DocumentRecord[]> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/customers/${customerId}`, {
            headers,
            params: { shop_id: getShopId(), ...params },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch customer documents");
    }
};

/**
 * Get the full folder + document tree for a customer in a single call.
 */
export const getCustomerTree = async (customerId: string): Promise<{
    root: DocumentRecord;
    descendants: DocumentRecord[];
}> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/customers/${customerId}/tree`, { headers });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch customer tree");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS (cheques, invoices, quotations, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create any document type.
 * Pass files[] to upload attachments to DigitalOcean Spaces in the same request.
 */
export const createDocument = async (params: {
    name: string;
    document_type: DocumentType;
    status?: DocumentStatus;
    parent_id?: string | null;
    customer_id?: string | null;
    shop_id?: string;
    description?: string;
    meta?: DocumentMeta;
    counterparty?: Counterparty;
    files?: File[];
}): Promise<DocumentRecord> => {
    try {
        const { files, meta, counterparty, ...rest } = params;
        const hasFiles = files && files.length > 0;

        let response;

        if (hasFiles) {
            const formData = buildFormData(
                {
                    ...rest,
                    shop_id: rest.shop_id || getShopId(),
                    meta: meta ? JSON.stringify(meta) : undefined,
                    counterparty: counterparty ? JSON.stringify(counterparty) : undefined,
                },
                files
            );
            response = await axiosInstance.post(`${documentUrl}`, formData, {
                headers: { ...headers, "Content-Type": undefined },
            });
        } else {
            response = await axiosInstance.post(
                `${documentUrl}`,
                { ...rest, shop_id: rest.shop_id || getShopId(), meta, counterparty },
                { headers }
            );
        }

        // message.success("Document created successfully");
        return response.data.document;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to create document");
        throw error;
    }
};

/**
 * List documents with optional filters and pagination.
 */
export const getAllDocuments = async (params?: {
    document_type?: DocumentType;
    status?: DocumentStatus;
    parent_id?: string;
    customer_id?: string;
    shop_id?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    current?: number;
    pageSize?: number;
}): Promise<PaginatedResponse<DocumentRecord>> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}`, {
            headers,
            params: { shop_id: getShopId(), ...params },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch documents");
    }
};

/**
 * Get a single document by its ID.
 */
export const getDocumentById = async (documentId: string): Promise<DocumentRecord> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/${documentId}`, { headers });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch document");
    }
};

/**
 * Update a document's fields.
 * Pass files[] to add new attachments.
 * Pass remove_attachments[] (array of file_url strings) to delete specific files.
 */
export const updateDocument = async (
    documentId: string,
    params: {
        name?: string;
        status?: DocumentStatus;
        description?: string;
        meta?: Partial<DocumentMeta>;
        counterparty?: Partial<Counterparty>;
        files?: File[];
        remove_attachments?: string[];
    }
): Promise<DocumentRecord> => {
    try {
        const { files, meta, counterparty, remove_attachments, ...rest } = params;
        const hasFiles = files && files.length > 0;

        let response;

        if (hasFiles) {
            const formData = buildFormData(
                {
                    ...rest,
                    meta: meta ? JSON.stringify(meta) : undefined,
                    counterparty: counterparty ? JSON.stringify(counterparty) : undefined,
                    remove_attachments: remove_attachments ? JSON.stringify(remove_attachments) : undefined,
                },
                files
            );
            response = await axiosInstance.put(`${documentUrl}/${documentId}`, formData, {
                headers: { ...headers, "Content-Type": undefined },
            });
        } else {
            response = await axiosInstance.put(
                `${documentUrl}/${documentId}`,
                { ...rest, meta, counterparty, remove_attachments },
                { headers }
            );
        }

        // message.success("Document updated successfully");
        return response.data.document;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to update document");
        throw error;
    }
};

/**
 * Quick status update — the fastest way to move a document through its lifecycle.
 * Pass meta to update specific meta fields at the same time.
 *
 * Example — move a cheque to processed:
 *   updateDocumentStatus(id, "cheque_processed", { processed_date: new Date().toISOString() })
 */
export const updateDocumentStatus = async (
    documentId: string,
    status: DocumentStatus,
    meta?: Partial<DocumentMeta>
): Promise<DocumentRecord> => {
    try {
        const response = await axiosInstance.patch(
            `${documentUrl}/${documentId}/status`,
            { status, meta },
            { headers }
        );
        // message.success("Status updated successfully");
        return response.data.document;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to update status");
        throw error;
    }
};

/**
 * Soft-delete a document (and all its descendants if it is a folder).
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
    try {
        await axiosInstance.delete(`${documentUrl}/${documentId}`, { headers });
        // message.success("Document deleted successfully");
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to delete document");
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Universal document search.
 *
 * Pass `mode: "ai"` for OpenAI semantic / natural-language search.
 * Pass `mode: "normal"` (default) for fast regex search.
 *
 * Both modes support all the same structural filters (status, type, date,
 * amount, shop_id, etc.). The response always includes `search_mode` so
 * the UI can reflect which engine ran — useful when AI falls back to normal
 * because OPENAI_API_KEY is not configured on the server.
 *
 * Examples:
 *   // Normal keyword search
 *   searchDocuments({ q: "Kamau", mode: "normal", document_type: "invoice" })
 *
 *   // AI semantic search — understands natural language
 *   searchDocuments({ q: "pending payments from last month", mode: "ai" })
 *
 *   // AI search with similarity threshold override
 *   searchDocuments({ q: "bounced cheques", mode: "ai", threshold: 0.45 })
 */
export const searchDocuments = async (params: SearchParams): Promise<SearchResponse> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/search`, {
            headers,
            params: {
                shop_id: getShopId(),
                ...params,
            },
        });
        return response.data;
    } catch (error) {
        message.error("Search failed. Please try again.");
        throw new Error("Failed to search documents");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING MANAGEMENT  (AI search setup)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate (or regenerate) the OpenAI embedding for a single document.
 *
 * Call this after creating or significantly updating a document so it
 * becomes discoverable via AI search. You can also automate this with a
 * post-save webhook or background job.
 */
export const embedDocument = async (documentId: string): Promise<{ message: string; document_id: string }> => {
    try {
        const response = await axiosInstance.post(
            `${documentUrl}/${documentId}/embed`,
            {},
            { headers }
        );
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to generate document embedding");
        throw error;
    }
};

/**
 * Batch-generate embeddings for all documents that are missing them or
 * whose embedding is older than 7 days.
 *
 * Safe to call repeatedly — it only processes documents that need updating.
 * Useful for initial setup or as a scheduled maintenance task.
 *
 * @param batchSize  Max documents to process in one call (default 50, max 200).
 * @param shop_id    Optionally restrict to a specific shop.
 *
 * Example — seed embeddings for first time setup:
 *   embedAllDocuments({ batchSize: 100 })
 */
export const embedAllDocuments = async (params?: EmbedBatchParams): Promise<EmbedBatchResponse> => {
    try {
        const response = await axiosInstance.post(
            `${documentUrl}/embed/batch`,
            {
                batchSize: params?.batchSize ?? 50,
                shop_id: params?.shop_id ?? getShopId(),
            },
            { headers }
        );
        // message.success(
        //     `Embeddings updated: ${response.data.success} succeeded, ${response.data.failed} failed`
        // );
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to run batch embedding");
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHEQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List cheques, optionally filtered by status and date range.
 */
export const getCheques = async (params?: {
    status?: DocumentStatus;
    shop_id?: string;
    startDate?: string;
    endDate?: string;
    current?: number;
    pageSize?: number;
}): Promise<PaginatedResponse<DocumentRecord>> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/cheques`, {
            headers,
            params: { shop_id: getShopId(), ...params },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch cheques");
    }
};

/**
 * Aggregate cheque counts and total amounts grouped by status.
 * Useful for dashboard summary cards.
 *
 * Example response:
 *   {
 *     cheque_received:  { count: 12, total_amount: 450000 },
 *     cheque_pending:   { count: 4,  total_amount: 120000 },
 *     cheque_processed: { count: 30, total_amount: 980000 },
 *   }
 */
export const getChequeStats = async (
    shop_id?: string
): Promise<Record<string, { count: number; total_amount: number }>> => {
    try {
        const response = await axiosInstance.get(`${documentUrl}/cheques/stats`, {
            headers,
            params: { shop_id: shop_id || getShopId() },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch cheque stats");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add one or more files to an existing document.
 */
export const addAttachments = async (
    documentId: string,
    files: File[]
): Promise<DocumentAttachment[]> => {
    try {
        const formData = new FormData();
        files.forEach((file) => formData.append("attachments", file, file.name));

        const response = await axiosInstance.post(
            `${documentUrl}/${documentId}/attachments`,
            formData,
            { headers: { ...headers, "Content-Type": undefined } }
        );
        // message.success(`${files.length} file(s) uploaded successfully`);
        return response.data.attachments;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to upload attachments");
        throw error;
    }
};

/**
 * Remove specific attachments from a document by their URLs.
 * Also deletes the files from DigitalOcean Spaces.
 */
export const removeAttachments = async (
    documentId: string,
    fileUrls: string[]
): Promise<DocumentAttachment[]> => {
    try {
        const response = await axiosInstance.delete(
            `${documentUrl}/${documentId}/attachments`,
            { headers, data: { file_urls: fileUrls } }
        );
        // message.success("Attachment(s) removed successfully");
        return response.data.attachments;
    } catch (error) {
        if (error?.response?.status !== 403) message.error("Failed to remove attachments");
        throw error;
    }
};