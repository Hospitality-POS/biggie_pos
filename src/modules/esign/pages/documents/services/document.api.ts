import { message } from 'antd';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  DocumentRecord,
  DocumentStatus,
  DocumentType,
  PaginatedResponse,
  SearchParams,
  SearchResponse,
  EmbedBatchParams,
  EmbedBatchResponse,
} from '../../../types';

const documentUrl = `${BASE_URL}/documents`;

const getShopId = (): string | null => localStorage.getItem('shopId');

const buildFormData = (fields: Record<string, any>, files?: File[]): FormData => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object' && !(value instanceof File)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });

  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append('attachments', file, file.name);
    });
  }

  return formData;
};

// ─────────────────────────────────────────────────────────────────────────────
// FOLDERS
// ─────────────────────────────────────────────────────────────────────────────

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
    });
    message.success('Folder created successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to create folder';
    message.error(msg);
    throw new Error(msg);
  }
};

export const getFolders = async (params?: {
  parent_id?: string | null;
  customer_id?: string | null;
  shop_id?: string;
}): Promise<DocumentRecord[]> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/folders`, {
      params: {
        ...params,
        shop_id: params?.shop_id || getShopId(),
      },
    });
    return response.data?.data || response.data || [];
  } catch (error: any) {
    console.error('Error fetching folders:', error);
    return [];
  }
};

export const updateFolder = async (
  folderId: string,
  params: { name?: string; description?: string; parent_id?: string | null }
): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.put(`${documentUrl}/folders/${folderId}`, params);
    message.success('Folder updated successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to update folder';
    message.error(msg);
    throw new Error(msg);
  }
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`${documentUrl}/folders/${folderId}`);
    message.success('Folder deleted successfully');
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to delete folder';
    message.error(msg);
    throw new Error(msg);
  }
};

export const getFolderTree = async (params?: {
  customer_id?: string | null;
  shop_id?: string;
}): Promise<DocumentRecord[]> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/folders/tree`, {
      params: {
        ...params,
        shop_id: params?.shop_id || getShopId(),
      },
    });
    return response.data?.data || response.data || [];
  } catch (error: any) {
    console.error('Error fetching folder tree:', error);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const createDocument = async (
  fields: {
    name: string;
    document_type: DocumentType;
    status?: DocumentStatus;
    description?: string;
    parent_id?: string | null;
    customer_id?: string | null;
    counterparty?: any;
    meta?: any;
    shop_id?: string;
  },
  files?: File[]
): Promise<DocumentRecord> => {
  try {
    const payload = {
      ...fields,
      shop_id: fields.shop_id || getShopId(),
    };
    const formData = buildFormData(payload, files);
    const response = await axiosInstance.post(documentUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success('Document created successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to create document';
    message.error(msg);
    throw new Error(msg);
  }
};

export const getAllDocuments = async (params?: {
  document_type?: string;
  status?: string;
  customer_id?: string;
  parent_id?: string;
  shop_id?: string;
  current?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<DocumentRecord>> => {
  try {
    const response = await axiosInstance.get(documentUrl, {
      params: {
        ...params,
        shop_id: params?.shop_id || getShopId(),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return { data: [], total: 0, current: 1, pageSize: 10, success: false };
  }
};

export const getDocumentById = async (id: string): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/${id}`);
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to fetch document';
    message.error(msg);
    throw new Error(msg);
  }
};

export const updateDocument = async (
  id: string,
  fields: Partial<DocumentRecord>,
  files?: File[]
): Promise<DocumentRecord> => {
  try {
    const formData = buildFormData(fields, files);
    const response = await axiosInstance.put(`${documentUrl}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success('Document updated successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to update document';
    message.error(msg);
    throw new Error(msg);
  }
};

export const updateDocumentStatus = async (
  id: string,
  status: DocumentStatus
): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.patch(`${documentUrl}/${id}/status`, { status });
    message.success('Document status updated');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to update status';
    message.error(msg);
    throw new Error(msg);
  }
};

export const deleteDocument = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(`${documentUrl}/${id}`);
    message.success('Document deleted successfully');
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to delete document';
    message.error(msg);
    throw new Error(msg);
  }
};

export const searchDocuments = async (params: SearchParams): Promise<SearchResponse> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/search`, {
      params: {
        ...params,
        shop_id: params.shop_id || getShopId(),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return {
      data: [],
      total: 0,
      current: 1,
      pageSize: 10,
      success: false,
      facets: { by_type: [], by_status: [], amount_summary: null },
      search_mode: 'normal',
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHEQUES
// ─────────────────────────────────────────────────────────────────────────────

export const getCheques = async (params?: {
  status?: string;
  drawer_name?: string;
  payee_name?: string;
  date_from?: string;
  date_to?: string;
  shop_id?: string;
  current?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<DocumentRecord>> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/cheques`, {
      params: {
        ...params,
        shop_id: params?.shop_id || getShopId(),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching cheques:', error);
    return { data: [], total: 0, current: 1, pageSize: 10, success: false };
  }
};

export const getChequeStats = async (params?: {
  shop_id?: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${documentUrl}/cheques/stats`, {
      params: {
        shop_id: params?.shop_id || getShopId(),
      },
    });
    return response.data?.data || response.data;
  } catch (error: any) {
    console.error('Error fetching cheque stats:', error);
    return null;
  }
};

export const updateChequeStatus = async (
  id: string,
  status: DocumentStatus,
  metaUpdates?: { bounce_reason?: string; processed_date?: string }
): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.patch(`${documentUrl}/cheques/${id}/status`, {
      status,
      ...metaUpdates,
    });
    message.success('Cheque status updated');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to update cheque status';
    message.error(msg);
    throw new Error(msg);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const addAttachments = async (
  documentId: string,
  files: File[]
): Promise<DocumentRecord> => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append('attachments', file, file.name));
    const response = await axiosInstance.post(
      `${documentUrl}/${documentId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    message.success('Attachments added successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to add attachments';
    message.error(msg);
    throw new Error(msg);
  }
};

export const removeAttachments = async (
  documentId: string,
  attachmentUrls: string[]
): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.delete(`${documentUrl}/${documentId}/attachments`, {
      data: { attachment_urls: attachmentUrls },
    });
    message.success('Attachments removed successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to remove attachments';
    message.error(msg);
    throw new Error(msg);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDINGS / AI
// ─────────────────────────────────────────────────────────────────────────────

export const embedBatch = async (
  params?: EmbedBatchParams
): Promise<EmbedBatchResponse> => {
  try {
    const response = await axiosInstance.post(`${documentUrl}/embed/batch`, params);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to run batch embedding';
    message.error(msg);
    throw new Error(msg);
  }
};

export const embedDocument = async (id: string): Promise<DocumentRecord> => {
  try {
    const response = await axiosInstance.post(`${documentUrl}/${id}/embed`);
    message.success('Document embedded successfully');
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to embed document';
    message.error(msg);
    throw new Error(msg);
  }
};
