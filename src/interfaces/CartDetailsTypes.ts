export interface CartDetailsInterface {
  _id: string;
  table_id: {
    _id: string;
    name: string;
  } | string;
  created_by: {
    _id: string;
    username: string;
  };
  items: string[];
  order_no: string;
  status: string;
  discount: number;
  discount_type: string;
  clientPin: string;
  clientName: string;
  address?: {
    street?: string;
    building?: string;
    floor?: string;
    city?: string;
    county?: string;
    postal_code?: string;
    country?: string;
    landmark?: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}
