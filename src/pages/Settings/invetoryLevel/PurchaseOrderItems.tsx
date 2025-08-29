import React, { useState } from "react";
import {
    Button,
    Space,
    Typography,
    message
} from "antd";
import {
    PrinterOutlined,
    FileExcelOutlined,
    FilePdfOutlined
} from "@ant-design/icons";
import PrintPreviewModal from "./PrintPreviewModal";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { Text } = Typography;

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

interface PurchaseOrderItemsProps {
    record: PurchaseOrder;
}

const PurchaseOrderItems: React.FC<PurchaseOrderItemsProps> = ({ record }) => {
    // Print preview modal state for items
    const [printModal, setPrintModal] = useState({
        visible: false,
        data: null as PurchaseOrder | null,
        type: 'items' as 'single' | 'bulk' | 'items',
        title: ''
    });

    // Export purchase order items to Excel (Silent)
    const exportPOItemsToExcel = (record: PurchaseOrder) => {
        try {
            const itemsData = record.po_items.map(item => ({
                'PO Number': record.po_number,
                'Item Name': item.inventory_id?.name || 'N/A',
                'SKU': item.inventory_id?.sku || 'N/A',
                'Unit': item.unit_id?.name || 'N/A',
                'Quantity Ordered': item.quantity_ordered,
                'Quantity Received': item.quantity_received,
                'Unit Price': item.unit_price,
                'Total Price': item.total_price,
                'Status': item.quantity_received === 0 ? 'Not Delivered' :
                    item.quantity_received < item.quantity_ordered ? 'Partially Delivered' : 'Fully Delivered'
            }));

            const ws = XLSX.utils.json_to_sheet(itemsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Items_${record.po_number}`);
            XLSX.writeFile(wb, `po_items_${record.po_number}_${new Date().toISOString().split('T')[0]}.xlsx`);
            message.success(`Items exported to Excel`);
        } catch (error) {
            message.error('Failed to export items');
        }
    };

    // Export purchase order items to PDF (Silent)
    const exportPOItemsToPDF = (record: PurchaseOrder) => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`Items - ${record.po_number}`, 20, 20);

            const tableData = record.po_items.map(item => [
                item.inventory_id?.name || 'N/A',
                item.unit_id?.abbreviation || 'N/A',
                item.quantity_ordered.toString(),
                item.quantity_received.toString(),
                `Ksh ${item.unit_price.toLocaleString()}`,
                `Ksh ${item.total_price.toLocaleString()}`
            ]);

            (doc as any).autoTable({
                head: [['Item', 'Unit', 'Ordered', 'Received', 'Unit Price', 'Total']],
                body: tableData,
                startY: 35
            });

            doc.save(`po_items_${record.po_number}.pdf`);
            message.success(`Items exported to PDF`);
        } catch (error) {
            message.error('Failed to export items');
        }
    };

    // Show print preview for items
    const printPOItems = (record: PurchaseOrder) => {
        setPrintModal({
            visible: true,
            data: record,
            type: 'items',
            title: `Print Items - ${record.po_number}`
        });
    };

    // Close print modal
    const closePrintModal = () => {
        setPrintModal({
            visible: false,
            data: null,
            type: 'items',
            title: ''
        });
    };

    if (!record.po_items || record.po_items.length === 0) {
        return <Text type="secondary">No items in this purchase order</Text>;
    }

    return (
        <>
            <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                {/* Simple Actions */}
                <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                    <Space size="small">
                        <Button size="small" icon={<PrinterOutlined />} onClick={() => printPOItems(record)}>
                            Print
                        </Button>
                        <Button size="small" icon={<FileExcelOutlined />} onClick={() => exportPOItemsToExcel(record)}>
                            Excel
                        </Button>
                        <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportPOItemsToPDF(record)}>
                            PDF
                        </Button>
                    </Space>
                </div>

                {/* Simple Table */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #000' }}>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Item</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Unit</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>Ordered</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>Received</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>Pending</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Unit Price</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {record.po_items.map((item, index) => (
                            <tr key={item._id} style={{
                                borderBottom: '1px solid #ddd',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
                            }}>
                                <td style={{ padding: '8px' }}>
                                    <div style={{ fontWeight: '500' }}>{item.inventory_id?.name || 'N/A'}</div>
                                    {item.inventory_id?.sku && (
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            SKU: {item.inventory_id.sku}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '8px' }}>
                                    {item.unit_id?.abbreviation || item.unit_id?.name || 'N/A'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    {item.quantity_ordered}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    {item.quantity_received}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    {item.quantity_ordered - item.quantity_received}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                    Ksh {item.unit_price.toLocaleString()}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '500' }}>
                                    Ksh {item.total_price.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                            <td colSpan={6} style={{ padding: '12px', textAlign: 'right' }}>
                                TOTAL AMOUNT:
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                                Ksh {record.total_amount.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Simple Summary */}
                <div style={{
                    marginTop: '16px',
                    padding: '8px',
                    fontSize: '12px',
                    color: '#666',
                    borderTop: '1px solid #eee'
                }}>
                    <Text>
                        Items: {record.po_items.length} •
                        Delivered: {record.po_items.filter(item => item.quantity_received >= item.quantity_ordered).length} •
                        Pending: {record.po_items.filter(item => item.quantity_received < item.quantity_ordered).length} •
                        Progress: {record.delivery_percentage}%
                    </Text>
                </div>
            </div>

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

export default PurchaseOrderItems;

