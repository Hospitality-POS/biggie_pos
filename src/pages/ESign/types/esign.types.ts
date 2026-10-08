export interface Signer {
    user_id: string;
    name: string;
    email: string;
    order?: number;
    status?: "pending" | "signed" | "declined" | "skipped";
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
    status: "pending" | "signed";
    signature_image_url?: string;
    signature_type?: string;
    locked?: boolean;
}

export interface SigningWorkflow {
    workflow_type: "self_sign" | "send_for_signing";
    signers: Signer[];
    current_signer_index: number;
    expires_at?: string;
    message?: string;
}

export interface DocumentAttachment {
    file_url: string;
    file_name: string;
    file_type: string;
}

export interface Document {
    _id: string;
    name: string;
    attachments: DocumentAttachment[];
    signing_workflow?: SigningWorkflow;
    signatures?: SignatureField[];
    status: "draft" | "pending_signature" | "partially_signed" | "signed" | "declined";
    created_at?: string;
    updated_at?: string;
}

export interface PendingMarker {
    id: string;
    x: number;
    y: number;
    page: number;
    type: "signature" | "initials" | "stamp";
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

export type DocumentStatus = Document["status"];

export const DOCUMENT_STATUS_CONFIG: Record<
    DocumentStatus,
    { color: string; bg: string; label: string; dotColor: string }
> = {
    signed: {
        color: "#10b981",
        bg: "#d1fae5",
        label: "Signed",
        dotColor: "#10b981",
    },
    pending_signature: {
        color: "#f59e0b",
        bg: "#fef3c7",
        label: "Pending",
        dotColor: "#f59e0b",
    },
    partially_signed: {
        color: "#3b82f6",
        bg: "#dbeafe",
        label: "Partial",
        dotColor: "#3b82f6",
    },
    draft: {
        color: "#6b7280",
        bg: "#f3f4f6",
        label: "Draft",
        dotColor: "#9ca3af",
    },
    declined: {
        color: "#ef4444",
        bg: "#fee2e2",
        label: "Declined",
        dotColor: "#ef4444",
    },
};
