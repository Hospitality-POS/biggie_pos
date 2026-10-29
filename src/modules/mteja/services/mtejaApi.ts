export * from './client';
export * from '../pages/dashboard/services';
export * from '../pages/leads/services';
export * from '../pages/campaigns/services';
export * from '../pages/targets/services';
export * from '../pages/omnichannel/services';
export * from '../pages/calendar/services';
export * from '../pages/reports/services';

import * as dashboardApi from '../pages/dashboard/services';
import * as leadsApi from '../pages/leads/services';
import * as campaignsApi from '../pages/campaigns/services';
import * as targetsApi from '../pages/targets/services';
import * as omnichannelApi from '../pages/omnichannel/services';
import * as calendarApi from '../pages/calendar/services';
import * as reportsApi from '../pages/reports/services';

const mtejaApi = {
  ...dashboardApi,
  ...leadsApi,
  ...campaignsApi,
  ...targetsApi,
  ...omnichannelApi,
  ...calendarApi,
  ...reportsApi,
};

export default mtejaApi;
