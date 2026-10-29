import type { ModuleManifest } from '../../types/modules';

export const dukaManifest: ModuleManifest = {
  id: 'duka',
  name: 'Duka POS, Retail & Restaurant',
  description: 'Point-of-sale, table management, cart, catalog, orders, and real-time inventory',
  version: '1.0.0',
  icon: 'ShopOutlined',
  category: 'commerce',
  subdomains: [
    {
      id: 'dashboard',
      name: 'POS Dashboard',
      path: '/pos/dashboard',
      description: 'Real-time sales velocity, top sellers, hourly trends, and operational hubs',
    },
    {
      id: 'pos',
      name: 'Point of Sale',
      path: '/dashboard/:id',
      description: 'Quick-serve, retail barcode scanning, restaurant table checkout, and split bills',
    },
    {
      id: 'catalog',
      name: 'Product Catalog',
      path: '/main-category',
      description: 'Product definitions, categories, modifier add-ons, pricing, and barcodes',
    },
    {
      id: 'cart',
      name: 'Cart & Checkout',
      path: '/cart/cart/:cartId',
      description: 'Cart state management, item holds, customer associations, and deductions',
    },
    {
      id: 'tables',
      name: 'Table Management',
      path: '/tables',
      description: 'Visual floor plans, table statuses, server assignments, and dining zones',
    },
    {
      id: 'orders',
      name: 'Orders & Kitchen',
      path: '/orders',
      description: 'Active dining orders, kitchen tickets, delivery tracking, and order history',
    },
    {
      id: 'inventory',
      name: 'Stock & Inventory',
      path: '/inventory',
      description: 'Stock tracking, low-stock alerts, purchase orders, recipes, and transfers',
    },
  ],
  routes: [
    {
      path: '/pos/dashboard',
      exact: true,
      permission: ['UNIFIED_DASHBOARD_VIEW', 'ORDERS_VIEW_DASHBOARD'],
    },
    {
      path: '/tables',
      exact: true,
      permission: 'CART_VIEW_ITEMS',
    },
    {
      path: '/dashboard/:id',
      exact: true,
      permission: 'ORDERS_VIEW_DASHBOARD',
    },
    {
      path: '/cart/cart/:cartId',
      exact: true,
      permission: 'ORDERS_VIEW_DASHBOARD',
    },
    {
      path: '/main-category',
      exact: true,
      permission: 'CATEGORIES_VIEW',
    },
  ],
};

export default dukaManifest;
