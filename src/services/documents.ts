/**
 * Legacy Documents service adapter
 * Forwards to canonical feature-sliced E-Sign & Document Center module
 */

export * from '@modules/esign/types';
export * from '@modules/esign/pages/documents/services';

import * as documentApi from '@modules/esign/pages/documents/services';
export default documentApi;