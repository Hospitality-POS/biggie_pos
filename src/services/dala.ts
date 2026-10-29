/**
 * Legacy Dala Services adapter
 * Forwards to canonical feature-sliced Dala module services and types
 */

export * from '@modules/dala/types';
export * from '@modules/dala/services/dalaApi';

import dalaApi from '@modules/dala/services/dalaApi';
export default dalaApi;
