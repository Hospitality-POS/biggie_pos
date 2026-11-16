export * from './client';
export * from '../pages/properties/services';
export * from '../pages/units/services';
export * from '../pages/leases/services';
export * from '../pages/sales/services';
export * from '../pages/commissions/services';
export * from '../pages/rent/services';
export * from '../pages/maintenance/services';
export * from '../pages/property-types/services';
export * from '../pages/reports/services';

import * as propertiesApi from '../pages/properties/services';
import * as unitsApi from '../pages/units/services';
import * as leasesApi from '../pages/leases/services';
import * as salesApi from '../pages/sales/services';
import * as commissionsApi from '../pages/commissions/services';
import * as rentApi from '../pages/rent/services';
import * as maintenanceApi from '../pages/maintenance/services';
import * as propertyTypesApi from '../pages/property-types/services';
import * as reportsApi from '../pages/reports/services';

const dalaApi = {
  ...propertiesApi,
  ...unitsApi,
  ...leasesApi,
  ...salesApi,
  ...commissionsApi,
  ...rentApi,
  ...maintenanceApi,
  ...propertyTypesApi,
  ...reportsApi,
};

export default dalaApi;
