import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const printerUrl = `${BASE_URL}/printer`;
const printerServiceUrl = `${BASE_URL}/printer-service`;

export const getAllPrinters = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${printerUrl}`, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createPrinter = async (data: any) => {
  try {
    const response = await axiosInstance.post(`${printerUrl}`, data);
    // message.success("Printer added successfully");
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const updatePrinter = async (data: any) => {
  try {
    const response = await axiosInstance.put(`${printerUrl}/${data._id}`, { 
      ...data?.values, 
      main_category: data?.values?.main_category?.value || data.values.main_category
    });
    // message.success("Printer updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to update printer");
    }
  }
};

export const deletePrinter = async (printerId: string) => {
  try {
    const response = await axiosInstance.delete(`${printerUrl}/${printerId}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to delete printer");
    }
  }
};

// Printer Service API Methods
export interface PrinterConfig {
  printer_name: string;
  printer_type: string;
  connection_type: string;
  ip_address: string;
  port: number;
  paper_width: number;
  characters_per_line: number;
  line_spacing: number;
  is_default: boolean;
  is_active: boolean;
  timeout_ms: number;
  retry_attempts: number;
}

export interface DiscoveredPrinter {
  ip_address: string;
  ports: number[];
  likely_printer: boolean;
  confidence: number;
  services: Array<{
    type: string;
    protocol: string;
    description: string;
    port: number;
  }>;
}

export const getPrinterConfig = async (shopId: string, tenantCode: string): Promise<{ success: boolean; printer_config?: PrinterConfig; error?: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/config?shop_id=${shopId}`, {
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      }
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch printer configuration:', error);
    throw error;
  }
};

export const savePrinterConfig = async (shopId: string, tenantCode: string, printerConfig: PrinterConfig): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/config?shop_id=${shopId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      },
      body: JSON.stringify({ printer_config: printerConfig })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to save printer configuration:', error);
    throw error;
  }
};

export const getLocalSubnet = async (tenantCode: string): Promise<{ success: boolean; subnet: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/subnet`, {
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      }
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch local subnet:', error);
    throw error;
  }
};

export const discoverPrinters = async (tenantCode: string, subnet: string, timeout = 3000, maxConcurrent = 15): Promise<{ success: boolean; printers: DiscoveredPrinter[]; error?: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/discover`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      },
      body: JSON.stringify({ 
        subnet,
        timeout,
        maxConcurrent
      })
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to discover printers:', error);
    throw error;
  }
};

export const testPrinterConnection = async (tenantCode: string, ipAddress: string, port = 9100, timeout = 5000): Promise<{ success: boolean; connected: boolean; message?: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/test-connection`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      },
      body: JSON.stringify({
        ip_address: ipAddress,
        port,
        timeout
      })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to test printer connection:', error);
    throw error;
  }
};

export const printTestPage = async (shopId: string, tenantCode: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${printerServiceUrl}/test-print?shop_id=${shopId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'companycode': tenantCode
      }
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Printer service not available');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to print test page:', error);
    throw error;
  }
};