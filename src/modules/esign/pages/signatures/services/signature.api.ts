import { message } from 'antd';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  Document,
  ShareDocumentParams,
  SubmitSignaturePayload,
} from '../../../types';

export const eSignService = {
  getFileBlobUrl: async (documentId: string, onProgress?: (percent: number) => void): Promise<string> => {
    const response = await axiosInstance.get(
      `${BASE_URL}/documents/${documentId}/signing/file`,
      {
        responseType: 'blob',
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
        type: response.headers['content-type'] || 'application/pdf',
      })
    );
  },

  uploadDocument: async (file: File, onProgress?: (percent: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    const response = await axiosInstance.post(
      `${BASE_URL}/documents/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
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

  downloadSignedDocument: async (documentId: string): Promise<void> => {
    const response = await axiosInstance.get(
      `${BASE_URL}/documents/${documentId}/signing/download`,
      { responseType: 'blob' }
    );

    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const filename = match
      ? match[1].replace(/['"]/g, '')
      : `signed-document-${documentId}.pdf`;

    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
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
