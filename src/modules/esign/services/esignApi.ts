export * from './client';
export * from '../pages/documents/services';
export * from '../pages/signatures/services';
export * from '../pages/templates/services';
export * from '../pages/verification/services';

import * as documentsApi from '../pages/documents/services';
import * as signaturesApi from '../pages/signatures/services';
import * as templatesApi from '../pages/templates/services';
import * as verificationApi from '../pages/verification/services';

const esignApi = {
  ...documentsApi,
  ...signaturesApi,
  ...templatesApi,
  ...verificationApi,
};

export default esignApi;
