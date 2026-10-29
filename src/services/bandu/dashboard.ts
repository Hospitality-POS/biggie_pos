/**
 * Legacy Bandu Dashboard Service adapter
 * Forwards to canonical feature-sliced Bandu dashboard services
 */

export * from '@modules/bandu/pages/dashboard/services';
export * from '@modules/bandu/types';
import * as dashboardApi from '@modules/bandu/pages/dashboard/services';
export default dashboardApi;
