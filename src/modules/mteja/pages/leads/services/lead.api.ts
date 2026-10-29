import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  Lead,
  LeadStage,
  LeadListResponse,
  FetchLeadsParams,
  PipelineStageSummary,
  AnalyseLeadResult,
  ImportLeadResult,
} from '../../../types';
import { fetchProperties } from '../../../../dala';

const BASE = `${BASE_URL}/api/crm/leads`;

export const fetchAllLeads = async (
  params: FetchLeadsParams = {}
): Promise<LeadListResponse> => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch leads');
    return { total: 0, page: 1, pages: 0, leads: [] };
  }
};

export const fetchLeads = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch leads');
    return { data: [], total: 0 };
  }
};

export const getLeadById = async (
  leadId: string,
  shop_id?: string
): Promise<Lead | null> => {
  try {
    const response = await axiosInstance.get(`${BASE}/${leadId}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    return response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to fetch lead';
    message.error(msg);
    throw new Error(msg);
  }
};

export const fetchLeadById = getLeadById;

export const createLeadApi = async (data: Partial<Lead>) => {
  try {
    const response = await axiosInstance.post(BASE, data);
    message.success('Lead created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create lead';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateLeadApi = async (id: string, data: Partial<Lead>) => {
  try {
    const response = await axiosInstance.put(`${BASE}/${id}`, data);
    message.success('Lead updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update lead';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteLeadApi = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.delete(`${BASE}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    message.success('Lead deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete lead';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateLeadStageApi = async (
  id: string,
  stage: LeadStage,
  note?: string,
  shop_id?: string
) => {
  try {
    const response = await axiosInstance.patch(`${BASE}/${id}/stage`, {
      stage,
      note,
      shop_id,
    });
    message.success(`Lead moved to '${stage}'`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update lead stage';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const convertLeadApi = async (id: string, options?: any) => {
  try {
    const response = await axiosInstance.post(`${BASE}/${id}/convert`, options);
    message.success('Lead converted to customer successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to convert lead';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const convertLeadToCustomer = convertLeadApi;

export const fetchLeadSummary = async (params: { shop_id?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${BASE}/summary`, { params });
    return response.data?.data || response.data;
  } catch (error: any) {
    console.error('Error fetching lead summary:', error);
    return null;
  }
};

export const fetchLeadSources = async (shop_id?: string): Promise<string[]> => {
  try {
    const response = await axiosInstance.get(`${BASE}/sources`, {
      params: { shop_id },
    });
    return response.data?.sources || [];
  } catch (error: any) {
    console.error('Error fetching lead sources:', error);
    return [];
  }
};

export const isDalaEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem('tenant');
    const tenant = stored ? JSON.parse(stored) : null;
    return tenant?.modules?.dala === true;
  } catch {
    return false;
  }
};

export const fetchProjectOptions = async (shop_id?: string): Promise<string[]> => {
  const names = new Set<string>();

  try {
    const res = await fetchProperties(false);
    const list = res?.data || res?.properties || res || [];
    (Array.isArray(list) ? list : []).forEach((p: any) => {
      if (p?.name) names.add(p.name);
    });
  } catch {
    // dala module not available
  }

  try {
    const response = await axiosInstance.get(`${BASE}/projects`, {
      params: { shop_id },
    });
    (response.data?.projects || []).forEach((p: string) => p && names.add(p));
  } catch {
    // endpoint may not exist yet
  }

  return [...names];
};

export const fetchPipelineSummary = async (
  shop_id: string
): Promise<PipelineStageSummary[]> => {
  try {
    const response = await axiosInstance.get(`${BASE}/pipeline-summary`, {
      params: { shop_id },
    });
    return response.data.summary;
  } catch (error: any) {
    console.error('Error fetching pipeline summary:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch pipeline summary');
    return [];
  }
};

export const downloadLeadTemplate = async (): Promise<void> => {
  try {
    const response = await axiosInstance.get(`${BASE}/template`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads_import_template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.success('Template downloaded successfully');
  } catch (error) {
    console.error('Error downloading lead template:', error);
    message.error('Failed to download template');
    throw new Error('Failed to download lead template');
  }
};

export const analyseLeadFile = async (file: File): Promise<AnalyseLeadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<AnalyseLeadResult>(
      `${BASE}/analyse-import`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error analysing lead file:', error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      'Failed to analyse file. Please check the file format and try again.';
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

export const importLeadsFromExcel = async (
  file: File,
  shopId: string,
  assignedTo?: string,
  rowAssignments?: Record<number, string>
): Promise<ImportLeadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('shop_id', shopId);
    if (assignedTo) {
      formData.append('assigned_to', assignedTo);
    }
    if (rowAssignments && Object.keys(rowAssignments).length > 0) {
      formData.append('row_assignments', JSON.stringify(rowAssignments));
    }

    const response = await axiosInstance.post<ImportLeadResult>(
      `${BASE}/import`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );

    const data = response.data;

    if (data.summary.created > 0 || data.summary.updated > 0) {
      const createdMsg = data.summary.created > 0 ? `${data.summary.created} lead(s) created` : '';
      const updatedMsg = data.summary.updated > 0 ? `${data.summary.updated} lead(s) updated` : '';
      const itemsMsg = [createdMsg, updatedMsg].filter(Boolean).join(', ');
      const skippedMsg = data.summary.skipped > 0 ? `, ${data.summary.skipped} skipped` : '';
      message.success(`Import complete — ${itemsMsg}${skippedMsg}`);
    } else if (data.summary.errors > 0) {
      const firstErr = data.errors?.[0];
      message.warning(
        firstErr
          ? `Import issue: ${firstErr.reason}`
          : 'No leads were imported — check the error details below.'
      );
    } else {
      message.warning('No leads were imported. Check the error details.');
    }

    return data;
  } catch (error: any) {
    console.error('Error importing leads from Excel:', error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      'Failed to import leads. Please check the file format and try again.';
    message.error(errMsg);
    throw error;
  }
};
