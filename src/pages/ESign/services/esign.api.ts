import { message } from "antd";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import type {
    Document,
    LibraryItem,
    PublicLinkInfo,
    ShareDocumentParams,
    SubmitSignaturePayload,
} from "../types/esign.types";

export const STORAGE_KEYS = {
    SIGNATURES: "esign_saved_signatures",
    STAMPS: "esign_saved_stamps",
} as const;

export const saveToStorage = (key: string, data: LibraryItem): void => {
    try {
        const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = [...existing, data];
        localStorage.setItem(key, JSON.stringify(updated));
        message.success("Saved to library");
    } catch (error) {
        console.error("Failed to save to storage:", error);
        message.error("Failed to save to library");
    }
};

export const updateInStorage = (key: string, id: string, updates: Partial<LibraryItem>): void => {
    try {
        const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = existing.map((item) =>
            item.id === id ? { ...item, ...updates } : item
        );
        localStorage.setItem(key, JSON.stringify(updated));
        message.success("Updated in library");
    } catch (error) {
        console.error("Failed to update storage:", error);
        message.error("Failed to update library");
    }
};

export const getFromStorage = (key: string): LibraryItem[] => {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
        return [];
    }
};

export const deleteFromStorage = (key: string, id: string): void => {
    try {
        const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = existing.filter((item) => item.id !== id);
        localStorage.setItem(key, JSON.stringify(updated));
        message.success("Removed from library");
    } catch (error) {
        console.error("Failed to delete from storage:", error);
        message.error("Failed to remove from library");
    }
};

export const eSignService = {
    getFileBlobUrl: async (documentId: string, onProgress?: (percent: number) => void): Promise<string> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/file`,
            {
                responseType: "blob",
                onDownloadProgress: (event) => {
                    if (event.total && onProgress) {
                        const percent = Math.min(99, Math.round((event.loaded * 100) / event.total));
                        onProgress(percent);
                    }
                },
            }
        );
        onProgress?.(100);
        return window.URL.createObjectURL(
            new Blob([response.data], {
                type: response.headers["content-type"] || "application/pdf",
            })
        );
    },

    uploadDocument: async (file: File, onProgress?: (percent: number) => void): Promise<Document> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (event) => {
                    if (event.total && onProgress) {
                        const percent = Math.min(99, Math.round((event.loaded * 100) / event.total));
                        onProgress(percent);
                    }
                },
            }
        );
        onProgress?.(100);
        return response.data;
    },

    initiateSigning: async (documentId: string, data: Record<string, any>): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/initiate`,
            data
        );
        return response.data;
    },

    addSignatureField: async (documentId: string, data: Record<string, any>): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/fields`,
            data
        );
        return response.data;
    },

    updateSignatureField: async (
        documentId: string,
        fieldId: string,
        data: Record<string, any>
    ): Promise<any> => {
        const response = await axiosInstance.put(
            `${BASE_URL}/documents/${documentId}/signing/fields/${fieldId}`,
            data
        );
        return response.data;
    },

    deleteSignatureField: async (documentId: string, fieldId: string): Promise<any> => {
        const response = await axiosInstance.delete(
            `${BASE_URL}/documents/${documentId}/signing/fields/${fieldId}`
        );
        return response.data;
    },

    submitSignature: async (
        documentId: string,
        data: SubmitSignaturePayload
    ): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/submit`,
            data
        );
        return response.data;
    },

    getSigningStatus: async (documentId: string): Promise<any> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/status`
        );
        return response.data;
    },

    sendForSignature: async (documentId: string): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/send`
        );
        return response.data;
    },

    declineSigning: async (documentId: string, reason?: string): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/decline`,
            { reason }
        );
        return response.data;
    },

    previewSignedDocument: async (
        documentId: string
    ): Promise<{ previewType?: string; pages?: string[]; isPlaceholder?: boolean }> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/preview`
        );
        return response.data;
    },

    shareDocument: async (
        documentId: string,
        data: ShareDocumentParams
    ): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/share`,
            data
        );
        return response.data;
    },

    createPublicLink: async (
        documentId: string
    ): Promise<{ token: string; expires_at: string }> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/public-link`
        );
        return response.data;
    },

    getPublicLink: async (documentId: string): Promise<PublicLinkInfo> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/public-link`
        );
        return response.data;
    },

    revokePublicLink: async (documentId: string): Promise<any> => {
        const response = await axiosInstance.delete(
            `${BASE_URL}/documents/${documentId}/signing/public-link`
        );
        return response.data;
    },

    buildPublicSignUrl: (token: string): string => {
        const companyCode = localStorage.getItem("companyCode") || "";
        return `${window.location.origin}/esign/sign/${token}?c=${encodeURIComponent(companyCode)}`;
    },

    downloadSignedDocument: async (documentId: string): Promise<void> => {
        const response = await axiosInstance.get(
            `${BASE_URL}/documents/${documentId}/signing/download`,
            { responseType: "blob" }
        );

        const disposition = response.headers["content-disposition"] || "";
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        const filename = match
            ? match[1].replace(/['"]/g, "")
            : `signed-document-${documentId}.pdf`;

        const url = window.URL.createObjectURL(
            new Blob([response.data], { type: "application/pdf" })
        );
        const link = window.document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        window.document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);
    },

    clearSignature: async (documentId: string): Promise<any> => {
        const response = await axiosInstance.post(
            `${BASE_URL}/documents/${documentId}/signing/clear`
        );
        return response.data;
    },

    deleteDocument: async (documentId: string): Promise<any> => {
        const response = await axiosInstance.delete(
            `${BASE_URL}/documents/${documentId}`
        );
        return response.data;
    },

    getFileProxyUrl: (documentId: string): string => {
        return `${BASE_URL}/documents/${documentId}/signing/file`;
    },
};
