interface InvoiceDetailsInterface {
  served_by: {
    username: string;
  };
  created_by: {
    username: string;
  };
  items: {
    product_id: {
      name: string;
    };
    price: number;
    quantity: number;
    vat_type: string;
    vat_rate: number;
    vat_amount: number;
  }[];
  subtotal?: number;
  total_vat_amount?: number;
  discount_amount?: number;
  grand_total?: number;
  vat_breakdown?: {
    [key: string]: {
      rate?: number;
      amount?: number;
    };
  };
  order_no: string;
  createdAt: string;
  table_id?: {
    _id: string;
    name: string;
  };
}

interface OrderDetailsInterface {
  _id: string;
  cart_id: string;
  order_amount: number;
  discount: number;
  discount_type: string;
  updated_by: {
    _id: string;
    username: string;
  };
  served_by: {
    _id: string;
    username: string;
  };
  table_id: {
    _id: string;
    name: string;
  };
  order_no: string;
  method_ids: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  order_payments: OrderPayment[];
  vat_breakdown?: Record<string, { amount: number; rate: number }>;
  subtotal?: number;
  total_vat_amount?: number;
}

interface InvoiceReprintModalProps {
  invoiceId: string;
  orderNo: string;
  invoiceData: InvoiceDetailsInterface;
}

