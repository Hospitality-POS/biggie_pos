export * from './client';
export * from '../pages/dashboard/services';
export * from '../pages/accounts/services';
export * from '../pages/invoices/services';
export * from '../pages/banking/services';
export * from '../pages/journals/services';
export * from '../pages/taxes/services';
export * from '../pages/reports/services';
export * from '../pages/assets/services';

import * as dashboardApi from '../pages/dashboard/services';
import * as accountsApi from '../pages/accounts/services';
import * as invoicesApi from '../pages/invoices/services';
import * as bankingApi from '../pages/banking/services';
import * as journalsApi from '../pages/journals/services';
import * as taxesApi from '../pages/taxes/services';
import * as reportsApi from '../pages/reports/services';
import * as assetsApi from '../pages/assets/services';

const pesaApi = {
  ...dashboardApi,
  ...accountsApi,
  ...invoicesApi,
  ...bankingApi,
  ...journalsApi,
  ...taxesApi,
  ...reportsApi,
  ...assetsApi,
};

export default pesaApi;
