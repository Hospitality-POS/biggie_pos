import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';
import type {
  Employee,
  CreateEmployeeParams,
  EmployeeImportResult,
  EmployeeAnalysisResult,
  EmployeeDocument,
} from '../../../types';

export const createEmployee = async (params: CreateEmployeeParams) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/employees`, params);
    message.success('Employee created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create employee';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployees = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees`, {
      params: {
        page: params.page,
        limit: params.limit,
        department_id: params.department_id,
        employment_status: params.employment_status,
        employment_type: params.employment_type,
        shop_id: params.shop_id,
        search: params.search,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch employees');
    return { employees: [], total: 0 };
  }
};

export const fetchAllEmployees = async (params: ParamsType = {}) => {
  const limit = 500;
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchEmployees({ ...params, page, limit });
    const rows = res?.data || [];
    all.push(...rows);
    if (rows.length < limit || all.length >= (res?.pagination?.total ?? 0)) break;
  }
  return all;
};

export const getEmployeeById = async (employeeId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/${employeeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch employee';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateEmployee = async (employeeId: string, params: Partial<CreateEmployeeParams>) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/employees/${employeeId}`, params);
    message.success('Employee updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update employee';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateEmployeeStatus = async (
  employeeId: string,
  params: {
    employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
    reason?: string;
    suspension_start_date?: string;
    suspension_end_date?: string;
  }
) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/employees/${employeeId}/status`, params);
    message.success('Employment status updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update employment status';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteEmployee = async (employeeId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/employees/${employeeId}`);
    message.success('Employee deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete employee';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const permanentlyDeleteEmployee = async (employeeId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/employees/${employeeId}/permanent`);
    message.success('Employee permanently deleted');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete employee';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployeesByDepartment = async (departmentId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/department/${departmentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching employees by department:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch employees');
    return { employees: [] };
  }
};

export const downloadEmployeeTemplate = async (): Promise<void> => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/template`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee_import_template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    message.success('Template downloaded successfully');
  } catch (error) {
    console.error('Error downloading employee template:', error);
    message.error('Failed to download template');
    throw new Error('Failed to download employee template');
  }
};

export const analyseEmployeeFile = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<EmployeeAnalysisResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<EmployeeAnalysisResult>(
      `${BANDU_API_URL}/employees/analyse-import`,
      formData,
      {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error analysing employee file:', error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      'Failed to analyse file. Please check the file format and try again.';
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

export const importEmployeesFromExcel = async (
  file: File,
  shopId?: string | null,
  updateMode = false,
  onProgress?: (percent: number) => void
): Promise<EmployeeImportResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (shopId) formData.append('shop_id', shopId);
    if (updateMode) formData.append('update_mode', 'true');
    const response = await axiosInstance.post<EmployeeImportResult>(
      `${BANDU_API_URL}/employees/import-excel`,
      formData,
      {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error importing employees:', error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      'Failed to import employees.';
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

export const exportEmployees = async (params: ParamsType = {}): Promise<void> => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/export`, {
      params: {
        department_id: params.department_id,
        shop_id: params.shop_id,
        employment_status: params.employment_status,
        employment_type: params.employment_type,
        search: params.search,
      },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees_export.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.success('Employees exported successfully');
  } catch (error) {
    console.error('Error exporting employees:', error);
    message.error('Failed to export employees');
    throw new Error('Failed to export employees');
  }
};

export const uploadEmployeeDocument = async (

  employeeId: string,
  file: File,
  documentType: string,
  documentName: string,
  description?: string,
  expirationDate?: string,
  accessLevel = 'private'
) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('document_name', documentName);
    if (description) formData.append('description', description);
    if (expirationDate) formData.append('expiration_date', expirationDate);
    formData.append('access_level', accessLevel);

    const response = await axiosInstance.post(`${BANDU_API_URL}/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success('Document uploaded successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload document';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployeeDocuments = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/employee/${employeeId}`, {
      params: {
        document_type: params.document_type,
        status: params.status,
      },
    });
    const payload = response.data;
    return { documents: payload?.data || payload?.documents || [] };
  } catch (error: any) {
    console.error('Error fetching employee documents:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch documents');
    return { documents: [] };
  }
};

export const fetchExpiringDocuments = async (days = 30) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/employees/alerts/expiring`, {
      params: { days },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching expiring documents:', error);
    return { alerts: [] };
  }
};

export const deleteEmployeeDocument = async (documentId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/employees/documents/${documentId}`);
    message.success('Document deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete document';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
