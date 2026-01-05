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
}

interface OrderPayment {
  _id: string;
  order_id: string;
  method_id: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
  name: string;
}
