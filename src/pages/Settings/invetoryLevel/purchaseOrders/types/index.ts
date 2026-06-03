import { ActionType } from "@ant-design/pro-components";
import { PurchaseOrderTableProps } from "..";

export interface PurchaseOrderItem {
  _id: string;
  inventory_id: {
    name: string;
    sku?: string;
  };
  unit_id: {
    name: string;
    abbreviation?: string;
  };
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface PurchaseOrder {
  _id: string;
  po_number: string;
  direction: 'supplier' | 'customer';
  supplier_id: {
    name: string;
    contact?: string;
    email?: string;
  } | null;
  customer_id: {
    customer_name: string;
    phone?: string;
    email?: string;
  } | null;
  status: 'pending' | 'approved' | 'partially_delivered' | 'fully_delivered' | 'cancelled';
  po_items: PurchaseOrderItem[];
  total_amount: number;
  delivery_percentage: number;
  expected_delivery_date?: string;
  created_by: {
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
  deliveries?: any[];
}

export interface PurchaseOrderTableProps {
  actionRef: React.RefObject<ActionType>;
  onDeletePO: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onPrintPO: (record: PurchaseOrder) => void;
  onExportToExcel: (data: PurchaseOrder[]) => void;
  onExportToPDF: (data: PurchaseOrder[]) => void;
  onBulkPrint: () => void;
  onGenerateSummary: () => void;
  onFetchData: (
    params: any,
    sort?: any,
    filter?: any
  ) => Promise<{
    data: PurchaseOrder[];
    success: boolean;
    total: number;
  }>;
}
