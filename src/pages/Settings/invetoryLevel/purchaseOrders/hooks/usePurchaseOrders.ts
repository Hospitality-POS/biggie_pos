import { useCallback, useState } from 'react';
import { message } from 'antd';
import { PurchaseOrder, PurchaseOrderItem } from '../types';
import { purchaseOrderApi } from '../api/purchaseOrdersApi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ParamsType } from '@ant-design/pro-components';

export const usePurchaseOrders = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [printModal, setPrintModal] = useState({
    visible: false,
    data: null as PurchaseOrder | PurchaseOrder[] | null,
    type: 'single' as 'single' | 'bulk' | 'items',
    title: ''
  });

  // Basic CRUD Operations
  const fetchPurchaseOrders = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const response = await purchaseOrderApi?.fetchAllPurchaseOrders(params);
      return {
        data: response.data,
        total: response.total,
        success: true,
      };
    } catch (err) {
      setError(err as Error);
      message.error('Failed to fetch purchase orders');
      return { data: [], total: 0, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const createPurchaseOrder = useCallback(async (data: Partial<PurchaseOrder>) => {
    setLoading(true);
    try {
      const response = await purchaseOrderApi?.addNewPurchaseOrder(data);
      message.success('Purchase order created successfully');
      return { data: response, success: true };
    } catch (err) {
      setError(err as Error);
    //   message.error('Failed to create purchase order');
      return { data: null, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePurchaseOrder = useCallback(async (data: Partial<PurchaseOrder>) => {
    setLoading(true);
    try {
      const response = await purchaseOrderApi?.editPurchaseOrder(data);
      message.success('Purchase order updated successfully');
      return { data: response, success: true };
    } catch (err) {
      setError(err as Error);
    //   message.error('Failed to update purchase order');
      return { data: null, success: false };
    } finally {
      setLoading(false);
    }
  }, []); 

  const deletePurchaseOrder = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await purchaseOrderApi?.deletePurchaseOrder(id);
      message.success('Purchase order deleted successfully');
      return { success: true };
    } catch (err) {
      setError(err as Error);
    //   message.error('Failed to delete purchase order');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (params: ParamsType) => {
    setLoading(true);
    try {
      const response = await purchaseOrderApi?.updatePurchaseOrderStatus(params);
      message.success(`Purchase order ${params.status} successfully`);
      return { data: response, success: true };
    } catch (err) {
      setError(err as Error);
    //   message.error(`Failed to update status to ${status}`);
      return { data: null, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Export and Print Functions
  const exportToExcel = useCallback(async (data: PurchaseOrder[]) => {
    try {
      const flattenedData = data.flatMap(po =>
        po.po_items.map(item => ({
          'PO Number': po.po_number,
          'Supplier': po.supplier_id?.name || 'N/A',
          'Status': po.status,
          'Item Name': item.inventory_id?.name || 'N/A',
          'SKU': item.inventory_id?.sku || 'N/A',
          'Unit': item.unit_id?.name || 'N/A',
          'Quantity Ordered': item.quantity_ordered,
          'Quantity Received': item.quantity_received,
          'Unit Price': item.unit_price,
          'Total Price': item.total_price,
          'Expected Delivery': po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A',
          'Created Date': new Date(po.createdAt).toLocaleDateString(),
          'Created By': po.created_by?.name || 'Unknown',
          'Notes': item.notes || po.notes || ''
        }))
      );

      const ws = XLSX.utils.json_to_sheet(flattenedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
      XLSX.writeFile(wb, `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      message.error('Failed to export to Excel');
      return { success: false };
    }
  }, []);

  const exportToPDF = useCallback(async (data: PurchaseOrder[]) => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text('Purchase Orders Report', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);

      const tableData = data.flatMap(po =>
        po.po_items.map(item => [
          po.po_number,
          po.supplier_id?.name || 'N/A',
          po.status,
          item.inventory_id?.name || 'N/A',
          item.quantity_ordered.toString(),
          item.quantity_received.toString(),
          `Ksh ${item.unit_price.toLocaleString()}`,
          `Ksh ${item.total_price.toLocaleString()}`
        ])
      );

      (doc as any).autoTable({
        head: [['PO Number', 'Supplier', 'Status', 'Item', 'Ordered', 'Received', 'Unit Price', 'Total']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      doc.save(`purchase_orders_${new Date().toISOString().split('T')[0]}.pdf`);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      message.error('Failed to export to PDF');
      return { success: false };
    }
  }, []);

  // Print Preview Functions
  const showPrintPreview = useCallback((record: PurchaseOrder) => {
    setPrintModal({
      visible: true,
      data: record,
      type: 'single',
      title: `Print Preview - ${record.po_number}`
    });
  }, []);

  const showBulkPrintPreview = useCallback(async () => {
    try {
      const { data } = await fetchPurchaseOrders({});
      if (data.length === 0) {
        message.info('No purchase orders found');
        return;
      }
      setPrintModal({
        visible: true,
        data,
        type: 'bulk',
        title: `Bulk Print Preview - ${data.length} Purchase Orders`
      });
    } catch (err) {
      setError(err as Error);
      message.error('Failed to load purchase orders for printing');
    }
  }, [fetchPurchaseOrders]);

  const closePrintModal = useCallback(() => {
    setPrintModal(prev => ({ ...prev, visible: false }));
  }, []);

  // Summary Functions
  const generateSummary = useCallback(async () => {
    try {
      const { data } = await fetchPurchaseOrders({});
      if (data.length === 0) {
        message.info('No purchase orders found');
        return { success: false };
      }

      const totalPOs = data.length;
      const totalValue = data.reduce((sum, po) => sum + (po.total_amount || 0), 0);
      const statusCounts = data.reduce((acc, po) => {
        acc[po.status] = (acc[po.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const totalItems = data.reduce((sum, po) => sum + (po.po_items?.length || 0), 0);

      return {
        success: true,
        data: {
          totalPOs,
          totalValue,
          statusCounts,
          totalItems
        }
      };
    } catch (err) {
      setError(err as Error);
      message.error('Failed to generate summary');
      return { success: false };
    }
  }, [fetchPurchaseOrders]);

  return {
    loading,
    error,
    printModal,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updateStatus,
    exportToExcel,
    exportToPDF,
    showPrintPreview,
    showBulkPrintPreview,
    closePrintModal,
    generateSummary
  };
};
