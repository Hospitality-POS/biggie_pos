import axiosInstance from "./request";

const BASE = "/customers";

export interface CustomerDocument {
    _id: string;
    customer_id: string;
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

export interface UploadCustomerDocumentParams {
    customer_id: string;
    shop_id: string;
    document_type: string;
    name?: string;
    description?: string;
    files?: File[];
}

export interface UpdateCustomerDocumentParams {
    shop_id: string;
    name?: string;
    description?: string;
    document_type?: string;
    files?: File[];
}

export interface FetchCustomerDocumentsParams {
    customer_id: string;
    shop_id: string;
}

/**
 * Fetch all documents for a customer
 */
export const fetchCustomerDocuments = async (
    params: FetchCustomerDocumentsParams
): Promise<CustomerDocument[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${params.customer_id}/documents`, {
            params: { shop_id: params.shop_id }
        });
        return response.data?.documents || response.data || [];
    } catch (error) {
        console.error("Error fetching customer documents:", error);
        throw error;
    }
};

/**
 * Upload a document for a customer
 */
export const uploadCustomerDocument = async (
    customerId: string,
    params: UploadCustomerDocumentParams
): Promise<CustomerDocument> => {
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

        const response = await axiosInstance.post(`${BASE}/${customerId}/documents`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            params: { shop_id: params.shop_id }
        });
        return response.data?.document || response.data;
    } catch (error) {
        console.error("Error uploading customer document:", error);
        throw error;
    }
};

/**
 * Update a customer document
 */
export const updateCustomerDocument = async (
    customerId: string,
    documentId: string,
    params: UpdateCustomerDocumentParams
): Promise<CustomerDocument> => {
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

        const response = await axiosInstance.put(`${BASE}/${customerId}/documents/${documentId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            params: { shop_id: params.shop_id }
        });
        return response.data?.document || response.data;
    } catch (error) {
        console.error("Error updating customer document:", error);
        throw error;
    }
};

/**
 * Delete a customer document
 */
export const deleteCustomerDocument = async (
    customerId: string,
    documentId: string,
    shop_id: string
): Promise<void> => {
    try {
        await axiosInstance.delete(`${BASE}/${customerId}/documents/${documentId}`, {
            params: { shop_id }
        });
    } catch (error) {
        console.error("Error deleting customer document:", error);
        throw error;
    }
};
