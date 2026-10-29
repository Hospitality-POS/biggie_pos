import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';

export const fetchCommissions = async (params?: {
  page?: number;
  limit?: number;
  agent_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  saleId?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/commissions`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch commissions:', error);
    throw error;
  }
};

export const payCommission = async (
  saleId: string,
  amount: number,
  notes?: string,
  paymentMethod?: string,
  reference?: string,
  withholdingTax?: any,
  paidToUser?: string
) => {
  try {
    const response = await axiosInstance.post(
      `${DALA_API_URL}/commissions/pay`,
      {
        saleId,
        amount,
        notes,
        paymentMethod,
        reference,
        withholdingTax,
        paidToUser,
      },
      {
        headers: getDalaHeaders(),
      }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      'Failed to record commission payment';
    throw new Error(errorMessage);
  }
};
