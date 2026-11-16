// ─────────────────────────────────────────────────────────────────────────────
// E-SIGNATURE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Signer {
  user_id: string;
  name: string;
  email: string;
  order?: number;
  status?: 'pending' | 'signed' | 'declined' | 'skipped';
}

export interface SignatureField {
  _id: string;
  signer_name: string;
  position: {
    x: number;
    y: number;
    page: number;
    width?: number;
    height?: number;
    containerWidth?: number;
    containerHeight?: number;
  };
  status: 'pending' | 'signed';
  signature_image_url?: string;
  signature_type?: string;
  locked?: boolean;
}

export interface SigningWorkflow {
  workflow_type: 'self_sign' | 'send_for_signing';
  signers: Signer[];
  current_signer_index: number;
  expires_at?: string;
  message?: string;
}

export interface DocumentAttachment {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface Document {
  _id: string;
  name: string;
  attachments: DocumentAttachment[];
  signing_workflow?: SigningWorkflow;
  signatures?: SignatureField[];
  status: 'draft' | 'pending_signature' | 'partially_signed' | 'signed' | 'declined';
  created_at?: string;
  updated_at?: string;
}

export interface PendingMarker {
  id: string;
  x: number;
  y: number;
  page: number;
  type: 'signature' | 'initials' | 'stamp';
  preloadedData?: string;
  preloadedType?: string;
  locked?: boolean;
}

export interface LibraryItem {
  id: string;
  data: string;
  type: string;
  name: string;
  createdAt: string;
}

export interface PublicLinkInfo {
  active: boolean;
  token: string | null;
  expires_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
}

export interface ShareDocumentParams {
  emails: string[];
  message?: string;
}

export interface SubmitSignaturePayload {
  signature_data?: string;
  signature_type: string;
  source_signature_id?: string;
  typed_signature_text?: string;
  position: {
    x: number;
    y: number;
    page: number;
    width?: number;
    height?: number;
    containerWidth?: number;
    containerHeight?: number;
  };
}

export type ESignDocumentStatus = Document['status'];

export const DOCUMENT_STATUS_CONFIG: Record<
  ESignDocumentStatus,
  { color: string; bg: string; label: string; dotColor: string }
> = {
  signed: {
    color: '#10b981',
    bg: '#d1fae5',
    label: 'Signed',
    dotColor: '#10b981',
  },
  pending_signature: {
    color: '#f59e0b',
    bg: '#fef3c7',
    label: 'Pending',
    dotColor: '#f59e0b',
  },
  partially_signed: {
    color: '#3b82f6',
    bg: '#dbeafe',
    label: 'In Progress',
    dotColor: '#3b82f6',
  },
  declined: {
    color: '#ef4444',
    bg: '#fee2e2',
    label: 'Declined',
    dotColor: '#ef4444',
  },
  draft: {
    color: '#6b7280',
    bg: '#f3f4f6',
    label: 'Draft',
    dotColor: '#6b7280',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT CENTER / RECORD TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'folder'
  | 'cheque'
  | 'quotation'
  | 'invoice'
  | 'receipt'
  | 'purchase_order'
  | 'delivery_note'
  | 'credit_note'
  | 'contract'
  | 'other';

export type DocumentStatus =
  // General
  | 'draft'
  | 'active'
  | 'archived'
  | 'cancelled'
  // Cheque
  | 'cheque_received'
  | 'cheque_pending'
  | 'cheque_processed'
  | 'cheque_bounced'
  | 'cheque_cancelled'
  // Financial
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'fulfilled';

export type SearchMode = 'normal' | 'ai';

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
  _similarity?: number;
  extracted_text?: string;
  content_extracted_at?: string;
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
  search_mode: SearchMode | 'fallback_normal';
  fallback_reason?: string;
  query?: string;
  threshold?: number;
}

export interface SearchParams {
  q?: string;
  mode?: SearchMode;
  threshold?: number;
  document_type?: string;
  status?: string;
  customer_id?: string;
  shop_id?: string;
  parent_id?: string;
  include_folders?: 'true' | 'false';
  has_attachments?: 'true' | 'false';
  amount_min?: number;
  amount_max?: number;
  date_field?: 'createdAt' | 'issue_date' | 'due_date' | 'processed_date';
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
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
