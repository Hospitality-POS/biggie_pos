/**
 * Legacy ESign service adapter
 * Forwards to canonical feature-sliced E-Sign module services
 */

export * from '@modules/esign/pages/signatures/services';
export * from '@modules/esign/pages/templates/services';
export * from '@modules/esign/pages/verification/services';

import { eSignService } from '@modules/esign/pages/signatures/services';
export default eSignService;
