export * from './client';
export * from '../pages/dashboard/services';
export * from '../pages/pos/services';
export * from '../pages/catalog/services';
export * from '../pages/cart/services';
export * from '../pages/tables/services';
export * from '../pages/orders/services';
export * from '../pages/inventory/services';

import * as dashboardApi from '../pages/dashboard/services';
import * as posApi from '../pages/pos/services';
import * as catalogApi from '../pages/catalog/services';
import * as cartApi from '../pages/cart/services';
import * as tablesApi from '../pages/tables/services';
import * as ordersApi from '../pages/orders/services';
import * as inventoryApi from '../pages/inventory/services';

const dukaApi = {
  ...dashboardApi,
  ...posApi,
  ...catalogApi,
  ...cartApi,
  ...tablesApi,
  ...ordersApi,
  ...inventoryApi,
};

export default dukaApi;
