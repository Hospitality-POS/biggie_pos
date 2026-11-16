/**
 * Legacy Shifts service adapter
 * Forwards to canonical feature-sliced Bandu shifts services
 */

export * from '@modules/bandu/pages/shifts/services';
import * as shiftsApi from '@modules/bandu/pages/shifts/services';
export default shiftsApi;
