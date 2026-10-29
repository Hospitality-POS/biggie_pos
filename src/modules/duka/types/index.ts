// ============================================
// DUKA POS & RETAIL TYPES
// ============================================

export type OrderStatus =
  | 'Pending'
  | 'In_Progress'
  | 'Ready'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus =
  | 'Unpaid'
  | 'Partially_Paid'
  | 'Paid'
  | 'Refunded';

export type OrderType =
  | 'Dine_In'
  | 'Takeaway'
  | 'Delivery'
  | 'Room_Service'
  | 'Online';

export interface OrderItem {
  _id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax?: number;
  notes?: string;
  modifiers?: Array<{ name: string; price: number }>;
}

export interface Order {
  _id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  table_id?: string | { _id: string; name: string };
  customer_id?: string | { _id: string; customer_name: string; phone?: string };
  waiter_id?: string | { _id: string; name: string };
  items: OrderItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  paid_amount: number;
  payment_method?: string;
  notes?: string;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Billed' | 'Dirty';

export interface Table {
  _id: string;
  table_name: string;
  capacity: number;
  status: TableStatus;
  location_id?: string | { _id: string; location_name: string };
  active_order_id?: string;
  assigned_waiter_id?: string;
  shop_id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableLocation {
  _id: string;
  location_name: string;
  description?: string;
  shop_id: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  category_id?: string | { _id: string; name: string };
  image_url?: string;
  is_active: boolean;
  stock_quantity?: number;
  track_stock?: boolean;
  shop_id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  image_url?: string;
  is_active: boolean;
  shop_id: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Array<{ name: string; price: number }>;
  notes?: string;
}

export interface Cart {
  cart_id: string;
  items: CartItem[];
  customer_id?: string;
  table_id?: string;
  discount?: number;
  subtotal: number;
  tax: number;
  total: number;
}
