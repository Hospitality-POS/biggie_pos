import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type NoteType = "CREDIT_NOTE" | "DEBIT_NOTE";
export type NoteDirection = "customer" | "supplier";
export type NoteStatus = "Draft" | "Approved" | "Applied" | "Voided";
export type VatType = "STANDARD" | "ZERO" | "EXEMPT" | "NONE" | "OUT_OF_SCOPE";

export interface NoteLine {
    _id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    vat_rate?: number;
    vat_type?: VatType;
    line_total?: number;
    vat_amount?: number;
    net_amount?: number;
    account_id: string | { _id: string; account_code: string; account_name: string };
    account_code?: string;
    account_name?: string;
    original_line_id?: string;
}

export interface Note {
    _id: string;
    note_no: string;
    note_type: NoteType;
    direction: NoteDirection;
    original_invoice_id?: string | { _id: string; invoice_no: string; grand_total: number; status: string };
    original_invoice_no?: string;
    original_bill_id?: { _id: string; bill_no: string; bill_date: string; due_date: string; grand_total: number; amount_paid: number; amount_due: number; status: string };
    original_bill_no?: string;
    customer_id?: string | { _id: string; customer_name: string; phone: string; email: string; code: string };
    supplier_id?: string | { _id: string; name: string; phone: string; email: string };
    issue_date: string;
    expiry_date?: string;
    lines: NoteLine[];
    subtotal: number;
    total_vat: number;
    total_discount: number;
    grand_total: number;
    status: NoteStatus;
    approved_at?: string;
    approved_by?: string | { _id: string; username: string; name: string };
    applied_at?: string;
    voided_at?: string;
    voided_by?: string | { _id: string; username: string; name: string };
    void_reason?: string;
    reason: string;
    notes?: string;
    internal_notes?: string;
    journal_entry_id?: string | { _id: string; entry_no: string; status: string };
    vat_pricing_mode?: "INCLUSIVE" | "EXCLUSIVE";
    vat_standard_rate?: number;
    shop_id: string;
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;
}

// ── Query param interfaces ───────────────────────────────────────────────────

export interface GetNotesParams {
    shop_id: string;
    note_type?: NoteType;
    direction?: NoteDirection;
    status?: NoteStatus;
    customer_id?: string;
    supplier_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateNoteParams {
    shop_id: string;
    note_type: NoteType;
    direction: NoteDirection;
    reason: string;
    status?: NoteStatus; // Optional for auto-approval control
    lines: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        discount?: number;
        vat_type?: VatType;
        vat_rate?: number;
        account_id: string;
        original_line_id?: string;
    }>;
    customer_id?: string;
    supplier_id?: string;
    original_invoice_id?: string;
    original_invoice_no?: string;
    issue_date?: string;
    expiry_date?: string;
    notes?: string;
    internal_notes?: string;
    vat_pricing_mode?: "INCLUSIVE" | "EXCLUSIVE";
    vat_standard_rate?: number;
}

export interface UpdateNoteParams {
    reason?: string;
    notes?: string;
    internal_notes?: string;
    issue_date?: string;
    expiry_date?: string;
    lines?: CreateNoteParams["lines"];
    vat_pricing_mode?: "INCLUSIVE" | "EXCLUSIVE";
    vat_standard_rate?: number;
    original_invoice_id?: string;
    original_invoice_no?: string;
}

// ============================================
// NOTES SERVICES
// ============================================

/**
 * Get all notes with optional filters and pagination.
 */
export const getAllNotes = async (params: GetNotesParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes`,
            { params }
        );
        return response.data as {
            notes: Note[];
            totalPages: number;
            currentPage: number;
            totalNotes: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single note by ID — fully populated.
 */
export const getNoteById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes/${id}`
        );
        return response.data as { note: Note };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all notes (credit + debit) linked to a specific invoice.
 * Includes net adjustment summary.
 */
export const getNotesByInvoice = async (invoice_id: string, shop_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes/by-invoice/${invoice_id}`,
            { params: { shop_id } }
        );
        return response.data as {
            notes: Note[];
            count: number;
            summary: {
                total_credit_notes: number;
                total_debit_notes: number;
                net_adjustment: number;
            };
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all credit notes for a specific customer.
 */
export const getNotesByCustomer = async (
    customer_id: string,
    shop_id: string,
    status?: NoteStatus
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes/by-customer/${customer_id}`,
            { params: { shop_id, status } }
        );
        return response.data as {
            notes: Note[];
            count: number;
            total_credits: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all notes (credit + debit) linked to a specific bill.
 * Includes net adjustment summary.
 */
export const getNotesByBill = async (bill_id: string) => {
    try {
        // Get all notes and filter client-side for now
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes`,
            { 
                params: { 
                    limit: 200 // Get more results to find all notes for this bill
                } 
            }
        );
        
        const allNotes = response.data.notes || [];
        
        // Filter notes that reference this bill
        const notesForBill = allNotes.filter((note: Note) => {
            // Check if original_bill_id matches (could be string or object)
            if (typeof note.original_bill_id === 'string') {
                return note.original_bill_id === bill_id;
            }
            if (typeof note.original_bill_id === 'object' && note.original_bill_id?._id) {
                return note.original_bill_id._id === bill_id;
            }
            return false;
        });
        
        const creditNotes = notesForBill.filter((note: Note) => note.note_type === "CREDIT_NOTE");
        const debitNotes = notesForBill.filter((note: Note) => note.note_type === "DEBIT_NOTE");
        
        const totalCreditNotes = creditNotes.reduce((sum: number, note: Note) => sum + (note.grand_total || 0), 0);
        const totalDebitNotes = debitNotes.reduce((sum: number, note: Note) => sum + (note.grand_total || 0), 0);
        const netAdjustment = totalCreditNotes - totalDebitNotes;
        
        return {
            notes: notesForBill,
            count: notesForBill.length,
            total_credit_notes: totalCreditNotes,
            total_debit_notes: totalDebitNotes,
            net_adjustment: netAdjustment,
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all debit notes for a specific supplier.
 */
export const getNotesBySupplier = async (
    supplier_id: string,
    shop_id: string,
    status?: NoteStatus
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/notes/by-supplier/${supplier_id}`,
            { params: { shop_id, status } }
        );
        return response.data as {
            notes: Note[];
            count: number;
            total_debits: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a note with auto-approval (defaults to Approved status).
 */
export const createNote = async (data: CreateNoteParams) => {
    try {
        // Auto-approve by default - set status to Approved unless explicitly Draft
        const payload = {
            ...data,
            status: data.status === "Draft" ? "Draft" : "Approved"
        };
        
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/notes`,
            payload
        );
        // message.success("Credit note created and auto-approved");
        return response.data as { note: Note };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating credit note");
        }
        throw error;
    }
};

/**
 * Update a Draft note — blocked once approved or applied.
 */
export const updateNote = async (id: string, data: UpdateNoteParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/notes/${id}`,
            data
        );
        // message.success("Note updated successfully");
        return response.data as { note: Note };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating note");
        }
        throw error;
    }
};

/**
 * Approve a Draft note.
 * Automatically creates and posts the journal entry.
 * CREDIT_NOTE: DR Revenue / DR VAT → CR Accounts Receivable
 * DEBIT_NOTE:  DR Accounts Payable → CR Expense / CR VAT
 */
export const approveNote = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/notes/${id}/approve`
        );
        // message.success("Note approved and journal entry created");
        return response.data as { note: Note; journal_entry: object };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error approving note");
        }
        throw error;
    }
};

/**
 * Apply an Approved note against the original invoice or as a payment credit.
 */
export const applyNote = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/notes/${id}/apply`
        );
        // message.success("Note applied successfully");
        return response.data as { note: Note };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error applying note");
        }
        throw error;
    }
};

/**
 * Void a Draft or Approved note.
 * If the note was Approved, a reversal journal entry is automatically created.
 */
export const voidNote = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/notes/${id}/void`,
            { reason }
        );
        // message.success("Note voided successfully");
        return response.data as { note: Note; reversal_entry?: object };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding note");
        }
        throw error;
    }
};

/**
 * Hard delete a Draft note.
 * Use voidNote() for Approved notes instead.
 */
export const deleteNote = async (id: string) => {
    try {
        await axiosInstance.delete(`${BASE_URL}/accounting/notes/${id}`);
        // message.success("Note deleted successfully");
        return true;
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error deleting note");
        }
        return false;
    }
};