import { useRef, useState } from "react";
import { ActionType } from "@ant-design/pro-components";
import { message } from "antd";
import { deletePurchaseOrder, fetchAllPurchaseOrders, updatePurchaseOrderStatus } from "@services/purchaseOrder";
import PurchaseOrderTable from "./PurchaseOrderTable";
import PrintPreviewModal from "./PrintPreviewModal";
import { useMutation } from "@tanstack/react-query";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PurchaseOrderItem {
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

interface PurchaseOrder {
    _id: string;
    po_number: string;
    supplier_id: {
        name: string;
        contact?: string;
        email?: string;
    };
    status: string;
    po_items: PurchaseOrderItem[];
    total_amount: number;
    delivery_percentage: number;
    expected_delivery_date?: string;
    created_by: {
        name: string;
        email?: string;
    };
    createdAt: string;
    notes?: string;
    deliveries?: any[];
}

const PurchaseOrderList = () => {
    const actionRef = useRef<ActionType>();

    // Print preview modal state
    const [printModal, setPrintModal] = useState({
        visible: false,
        data: null as PurchaseOrder | PurchaseOrder[] | null,
        type: 'single' as 'single' | 'bulk' | 'items',
        title: ''
    });

    const deletePOMutation = useMutation(deletePurchaseOrder, {
        onSuccess: () => {
            actionRef.current?.reload();
            message.success("Purchase order deleted successfully");
        },
        onError: () => message.error("Failed to delete purchase order"),
    });

    const updateStatusMutation = useMutation(updatePurchaseOrderStatus, {
        onSuccess: () => {
            actionRef.current?.reload();
            message.success("Purchase order status updated successfully");
        },
        onError: () => message.error("Failed to update purchase order status"),
    });

    // Handle purchase order deletion
    const handleDeletePO = (id: string) => {
        deletePOMutation.mutate(id);
    };

    // Handle status update
    const handleUpdateStatus = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status });
    };

    // Handle data fetching
    const handleFetchData = async (params: any, sort?: any, filter?: any) => {
        try {
            const queryParams = {
                ...params,
                current: params.current || 1,
                pageSize: params.pageSize || 10,
                ...(sort && Object.keys(sort).length > 0 && {
                    sortField: Object.keys(sort)[0],
                    sortOrder: Object.values(sort)[0] === 'ascend' ? 'asc' : 'desc'
                }),
                ...(filter && Object.keys(filter).length > 0 && {
                    ...filter
                })
            };

            const data = await fetchAllPurchaseOrders(queryParams);
            return {
                data: data,
                success: true,
                total: data.length,
            };
        } catch (error) {
            message.error('Failed to fetch purchase orders');
            return {
                data: [],
                success: false,
                total: 0,
            };
        }
    };

    // Export all purchase orders to Excel (Silent)
    const exportAllToExcel = (data: PurchaseOrder[]) => {
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

            // Silent download
            XLSX.writeFile(wb, `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
            message.success(`Excel file exported successfully (${data.length} purchase orders)`);
        } catch (error) {
            message.error('Failed to export to Excel');
        }
    };

    // Export all purchase orders to PDF (Silent)
    const exportAllToPDF = (data: PurchaseOrder[]) => {
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

            // Silent download
            doc.save(`purchase_orders_${new Date().toISOString().split('T')[0]}.pdf`);
            message.success(`PDF file exported successfully (${data.length} purchase orders)`);
        } catch (error) {
            message.error('Failed to export to PDF');
        }
    };

    // Show print preview for single Purchase Order
    const printPurchaseOrder = (record: PurchaseOrder) => {
        setPrintModal({
            visible: true,
            data: record,
            type: 'single',
            title: `Print Preview - ${record.po_number}`
        });
    };

    // Show print preview for bulk Purchase Orders
    const handleBulkPrint = async () => {
        try {
            const data = await fetchAllPurchaseOrders({});
            if (data.length === 0) {
                message.info('No purchase orders found');
                return;
            }

            setPrintModal({
                visible: true,
                data: data,
                type: 'bulk',
                title: `Bulk Print Preview - ${data.length} Purchase Orders`
            });
        } catch (error) {
            message.error('Failed to load purchase orders for printing');
        }
    };

    // Close print modal
    const closePrintModal = () => {
        setPrintModal({
            visible: false,
            data: null,
            type: 'single',
            title: ''
        });
    };

    // Handle summary report generation
    const handleGenerateSummary = async () => {
        try {
            const data = await fetchAllPurchaseOrders({});
            if (data.length === 0) {
                message.info('No purchase orders found');
                return;
            }

            // Calculate summary statistics
            const totalPOs = data.length;
            const totalValue = data.reduce((sum, po) => sum + (po.total_amount || 0), 0);
            const pendingPOs = data.filter(po => po.status === 'pending').length;
            const approvedPOs = data.filter(po => po.status === 'approved').length;
            const fullyDeliveredPOs = data.filter(po => po.status === 'fully_delivered').length;
            const partiallyDeliveredPOs = data.filter(po => po.status === 'partially_delivered').length;
            const cancelledPOs = data.filter(po => po.status === 'cancelled').length;
            const totalItems = data.reduce((sum, po) => sum + (po.po_items?.length || 0), 0);

            message.success(`Summary: ${totalPOs} POs, Total Value: Ksh ${totalValue.toLocaleString()}, ${totalItems} items`);
        } catch (error) {
            message.error('Failed to generate summary');
        }
    };

    return (
        <>
            <PurchaseOrderTable
                actionRef={actionRef}
                onDeletePO={handleDeletePO}
                onUpdateStatus={handleUpdateStatus}
                onPrintPO={printPurchaseOrder}
                onExportToExcel={exportAllToExcel}
                onExportToPDF={exportAllToPDF}
                onBulkPrint={handleBulkPrint}
                onGenerateSummary={handleGenerateSummary}
                onFetchData={handleFetchData}
            />

            <PrintPreviewModal
                visible={printModal.visible}
                onClose={closePrintModal}
                data={printModal.data}
                type={printModal.type}
                title={printModal.title}
            />
        </>
    );
};

export default PurchaseOrderList;