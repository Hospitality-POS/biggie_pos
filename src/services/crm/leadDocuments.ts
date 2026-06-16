import axiosInstance from "../request";

const BASE = "/crm/leads";

export interface LeadDocument {
    _id: string;
    lead_id: string;
    document_type: string;
    name?: string;
    description?: string;
    attachments?: Array<{
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
        uploaded_at: string;
        _id: string;
    }>;
    uploaded_by?: {
        _id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface UploadLeadDocumentParams {
    lead_id: string;
    shop_id: string;
    document_type: string;
    name?: string;
    description?: string;
    files?: File[];
}

export interface UpdateLeadDocumentParams {
    shop_id: string;
    name?: string;
    description?: string;
    document_type?: string;
    files?: File[];
}

export interface FetchLeadDocumentsParams {
    lead_id: string;
    shop_id: string;
}

/**
 * Fetch all documents for a lead
 */
export const fetchLeadDocuments = async (
    params: FetchLeadDocumentsParams
): Promise<LeadDocument[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${params.lead_id}/documents`, {
            params: { shop_id: params.shop_id }
        });
        return response.data?.documents || response.data || [];
    } catch (error) {
        console.error("Error fetching lead documents:", error);
        throw error;
    }
};

/**
 * Upload a document for a lead
 */
export const uploadLeadDocument = async (
    leadId: string,
    params: UploadLeadDocumentParams
): Promise<LeadDocument> => {
    try {
        const formData = new FormData();
        formData.append("document_type", params.document_type);
        
        if (params.name) formData.append("name", params.name);
        if (params.description) formData.append("description", params.description);
        if (params.files && params.files.length > 0) {
            params.files.forEach((file) => {
                formData.append("files", file);
            });
        }

        const response = await axiosInstance.post(`${BASE}/${leadId}/documents`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            params: { shop_id: params.shop_id }
        });
        return response.data?.document || response.data;
    } catch (error) {
        console.error("Error uploading lead document:", error);
        throw error;
    }
};

/**
 * Update a lead document
 */
export const updateLeadDocument = async (
    leadId: string,
    documentId: string,
    params: UpdateLeadDocumentParams
): Promise<LeadDocument> => {
    try {
        const formData = new FormData();
        
        if (params.name) formData.append("name", params.name);
        if (params.description) formData.append("description", params.description);
        if (params.document_type) formData.append("document_type", params.document_type);
        if (params.files && params.files.length > 0) {
            params.files.forEach((file) => {
                formData.append("files", file);
            });
        }

        const response = await axiosInstance.put(`${BASE}/${leadId}/documents/${documentId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            params: { shop_id: params.shop_id }
        });
        return response.data?.document || response.data;
    } catch (error) {
        console.error("Error updating lead document:", error);
        throw error;
    }
};

/**
 * Delete a lead document
 */
export const deleteLeadDocument = async (
    leadId: string,
    documentId: string,
    shop_id: string
): Promise<void> => {
    try {
        await axiosInstance.delete(`${BASE}/${leadId}/documents/${documentId}`, {
            params: { shop_id }
        });
    } catch (error) {
        console.error("Error deleting lead document:", error);
        throw error;
    }
};
