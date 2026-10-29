import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';

export interface RentPaymentParams {
  page?: number;
  limit?: number;
  leaseId?: string;
  status?: string;
  paymentMethod?: string;
  paymentType?: string;
  startDate?: string;
  endDate?: string;
  shop_id?: string;
}

export interface RecordRentPaymentData {
  leaseId: string;
  invoiceId?: string;
  occupantId?: string;
  propertyId?: string;
  unitId?: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  mpesaCode?: string;
  bankReference?: string;
  chequeNumber?: string;
  paymentType?: string;
  periodCovered?: string;
  status?: string;
  notes?: string;
  receiptNumber?: string;
  shop_id?: string;
}

export interface RentInvoiceParams {
  leaseId?: string;
  propertyId?: string;
  occupantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  shop_id?: string;
  page?: number;
  limit?: number;
}

export interface CreateRentInvoiceData {
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  lines?: Array<{
    description: string;
    lineType: string;
    quantity?: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  notes?: string;
  shop_id?: string;
  [key: string]: any;
}

export interface GenerateBulkInvoicesData {
  propertyId?: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  shop_id?: string;
}

// ── Rent Payments ─────────────────────────────────────────────────────────────

export const fetchRentPayments = async (params?: RentPaymentParams) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/rent-payments`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch rent payments:', error);
    throw error;
  }
};

export const recordRentPayment = async (data: RecordRentPaymentData) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/rent-payments`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Rent payment recorded successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to record rent payment';
    message.error(errorMessage);
    throw error;
  }
};

export const reverseRentPayment = async (id: string, reversalReason?: string) => {
  try {
    const response = await axiosInstance.post(
      `${DALA_API_URL}/rent-payments/${id}/reverse`,
      { reversalReason },
      { headers: getDalaHeaders() }
    );
    message.success('Payment reversed successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to reverse payment';
    message.error(errorMessage);
    throw error;
  }
};

// ── Rent Invoices ─────────────────────────────────────────────────────────────

export const fetchRentInvoices = async (params?: RentInvoiceParams) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/rent-invoices`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch rent invoices:', error);
    throw error;
  }
};

export const createRentInvoice = async (data: CreateRentInvoiceData) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/rent-invoices`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Invoice created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create invoice';
    message.error(errorMessage);
    throw error;
  }
};

export const issueRentInvoice = async (id: string) => {
  try {
    const response = await axiosInstance.post(
      `${DALA_API_URL}/rent-invoices/${id}/issue`,
      {},
      { headers: getDalaHeaders() }
    );
    message.success('Invoice issued successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to issue invoice';
    message.error(errorMessage);
    throw error;
  }
};

export const waiveRentInvoice = async (id: string, reason?: string) => {
  try {
    const response = await axiosInstance.post(
      `${DALA_API_URL}/rent-invoices/${id}/waive`,
      { reason },
      { headers: getDalaHeaders() }
    );
    message.success('Invoice waived successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to waive invoice';
    message.error(errorMessage);
    throw error;
  }
};

export const generateBulkInvoices = async (data: GenerateBulkInvoicesData) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/rent-invoices/generate`, data, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to generate invoices';
    message.error(errorMessage);
    throw error;
  }
};
