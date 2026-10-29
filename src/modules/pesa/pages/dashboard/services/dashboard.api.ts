import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  AccountingDashboardResponse,
  GetDashboardParams,
} from '../../../types';

export * from 'src/services/accounting/accountingDashboard';

export const getAccountingDashboard = async (
  params: GetDashboardParams
): Promise<AccountingDashboardResponse> => {
  const response = await axiosInstance.get(
    `${BASE_URL}/accounting/dashboard`,
    { params }
  );
  return response.data as AccountingDashboardResponse;
};

export const fetchAccountingDashboard = getAccountingDashboard;
