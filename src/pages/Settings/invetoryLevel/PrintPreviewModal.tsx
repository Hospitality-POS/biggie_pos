import React from "react";
import { Modal, Button, Space } from "antd";
import { PrinterOutlined, CloseOutlined } from "@ant-design/icons";

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

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    data: PurchaseOrder | PurchaseOrder[] | null;
    type: 'single' | 'bulk' | 'items';
    title?: string;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    visible,
    onClose,
    data,
    type,
    title
}) => {
    const handlePrint = () => {
        window.print();
    };

    const renderSinglePO = (record: PurchaseOrder) => (
        <div className="print-content">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1>PURCHASE ORDER</h1>
                <h2>{record.po_number}</h2>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div style={{ flex: 1 }}>
                    <h3>Supplier Information:</h3>
                    <p><strong>Name:</strong> {record.supplier_id?.name || 'N/A'}</p>
                    <p><strong>Contact:</strong> {record.supplier_id?.contact || 'N/A'}</p>
                    <p><strong>Email:</strong> {record.supplier_id?.email || 'N/A'}</p>
                </div>
                <div style={{ flex: 1 }}>
                    <h3>Order Information:</h3>
                    <p><strong>Status:</strong> {record.status}</p>
                    <p><strong>Expected Delivery:</strong> {record.expected_delivery_date ? new Date(record.expected_delivery_date).toLocaleDateString() : 'Not set'}</p>
                    <p><strong>Created By:</strong> {record.created_by?.name || 'Unknown'}</p>
                    <p><strong>Date:</strong> {new Date(record.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Unit</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Ordered</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Received</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Unit Price</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    {record.po_items.map((item, index) => (
                        <tr key={index}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.inventory_id?.name || 'N/A'}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.unit_id?.name || 'N/A'}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_ordered}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_received}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.unit_price.toLocaleString()}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.total_price.toLocaleString()}</td>
                        </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                        <td colSpan={5} style={{ border: '1px solid #ddd', padding: '8px' }}>TOTAL AMOUNT</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {record.total_amount.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            {record.notes && (
                <div style={{ marginTop: '20px' }}>
                    <strong>Notes:</strong> {record.notes}
                </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                <p>Generated on {new Date().toLocaleString()}</p>
            </div>
        </div>
    );

    const renderItemsOnly = (record: PurchaseOrder) => (
        <div className="print-content">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1>PURCHASE ORDER ITEMS</h1>
                <h2>{record.po_number}</h2>
            </div>

            <div style={{ marginBottom: '30px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Supplier:</strong> {record.supplier_id?.name || 'N/A'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Contact:</strong> {record.supplier_id?.contact || 'N/A'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Status:</strong> {record.status}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Expected Delivery:</strong> {record.expected_delivery_date ? new Date(record.expected_delivery_date).toLocaleDateString() : 'Not set'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Created By:</strong> {record.created_by?.name || 'Unknown'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Created Date:</strong> {new Date(record.createdAt).toLocaleDateString()}
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Item Name</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>SKU</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Unit</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Qty Ordered</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Qty Received</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Qty Pending</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Unit Price</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Total Price</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {record.po_items.map((item, index) => {
                        const status = item.quantity_received === 0 ? 'Not Delivered' :
                            item.quantity_received < item.quantity_ordered ? 'Partially Delivered' : 'Fully Delivered';
                        const statusColor = item.quantity_received === 0 ? '#ff4d4f' :
                            item.quantity_received < item.quantity_ordered ? '#fa8c16' : '#52c41a';

                        return (
                            <tr key={index}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.inventory_id?.name || 'N/A'}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.inventory_id?.sku || 'N/A'}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.unit_id?.abbreviation || item.unit_id?.name || 'N/A'}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_ordered}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_received}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_ordered - item.quantity_received}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.unit_price.toLocaleString()}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.total_price.toLocaleString()}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', color: statusColor, fontWeight: 'bold' }}>
                                    {status}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
                <div><strong>Total Items:</strong> {record.po_items.length}</div>
                <div><strong>Total Amount:</strong> Ksh {record.total_amount.toLocaleString()}</div>
                <div><strong>Delivery Progress:</strong> {record.delivery_percentage}%</div>
                <div><strong>Items Not Delivered:</strong> {record.po_items.filter(item => item.quantity_received === 0).length}</div>
                <div><strong>Items Partially Delivered:</strong> {record.po_items.filter(item => item.quantity_received > 0 && item.quantity_received < item.quantity_ordered).length}</div>
                <div><strong>Items Fully Delivered:</strong> {record.po_items.filter(item => item.quantity_received >= item.quantity_ordered).length}</div>
            </div>

            {record.notes && (
                <div style={{ marginTop: '20px' }}>
                    <strong>Notes:</strong> {record.notes}
                </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                <p>Generated on {new Date().toLocaleString()}</p>
            </div>
        </div>
    );

    const renderBulkPOs = (records: PurchaseOrder[]) => (
        <div className="print-content">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1>BULK PURCHASE ORDERS REPORT</h1>
                <p>Total Purchase Orders: {records.length}</p>
                <p>Generated on: {new Date().toLocaleString()}</p>
            </div>

            {records.map((record, index) => (
                <div key={record._id} style={{
                    marginBottom: '50px',
                    border: '2px solid #ccc',
                    padding: '20px',
                    pageBreakBefore: index > 0 ? 'always' : 'auto'
                }}>
                    <div style={{ background: '#f0f8ff', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
                        <h2 style={{ margin: 0, color: '#1890ff' }}>Purchase Order: {record.po_number}</h2>
                        <p style={{ margin: '5px 0 0 0' }}>
                            Status: <strong>{record.status}</strong> |
                            Items: {record.po_items?.length || 0} |
                            Total: Ksh {record.total_amount?.toLocaleString() || '0'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ flex: 1, marginRight: '20px' }}>
                            <h3>Supplier Information:</h3>
                            <p><strong>Name:</strong> {record.supplier_id?.name || 'N/A'}</p>
                            <p><strong>Contact:</strong> {record.supplier_id?.contact || 'N/A'}</p>
                            <p><strong>Email:</strong> {record.supplier_id?.email || 'N/A'}</p>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3>Order Information:</h3>
                            <p><strong>Expected Delivery:</strong> {record.expected_delivery_date ? new Date(record.expected_delivery_date).toLocaleDateString() : 'Not set'}</p>
                            <p><strong>Created By:</strong> {record.created_by?.name || 'Unknown'}</p>
                            <p><strong>Created Date:</strong> {new Date(record.createdAt).toLocaleDateString()}</p>
                            <p><strong>Delivery Progress:</strong> {record.delivery_percentage || 0}%</p>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>SKU</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Unit</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Ordered</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Received</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Pending</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Unit Price</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.po_items?.map((item, itemIndex) => (
                                <tr key={itemIndex}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.inventory_id?.name || 'N/A'}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.inventory_id?.sku || 'N/A'}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.unit_id?.abbreviation || item.unit_id?.name || 'N/A'}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_ordered}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_received}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity_ordered - item.quantity_received}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.unit_price.toLocaleString()}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {item.total_price.toLocaleString()}</td>
                                </tr>
                            )) || (
                                    <tr>
                                        <td colSpan={8} style={{ border: '1px solid #ddd', padding: '8px' }}>No items</td>
                                    </tr>
                                )}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                                <td colSpan={7} style={{ border: '1px solid #ddd', padding: '8px' }}>TOTAL AMOUNT</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ksh {record.total_amount?.toLocaleString() || '0'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {record.notes && (
                        <div><strong>Notes:</strong> {record.notes}</div>
                    )}

                    <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <strong>Items Summary:</strong><br />
                                Total Items: {record.po_items?.length || 0}<br />
                                Not Delivered: {record.po_items?.filter(item => item.quantity_received === 0).length || 0}<br />
                                Partially Delivered: {record.po_items?.filter(item => item.quantity_received > 0 && item.quantity_received < item.quantity_ordered).length || 0}<br />
                                Fully Delivered: {record.po_items?.filter(item => item.quantity_received >= item.quantity_ordered).length || 0}
                            </div>
                            <div>
                                <strong>Order Summary:</strong><br />
                                Total Amount: Ksh {record.total_amount?.toLocaleString() || '0'}<br />
                                Delivery Progress: {record.delivery_percentage || 0}%<br />
                                Status: {record.status}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                <p>End of Report - Generated on {new Date().toLocaleString()}</p>
            </div>
        </div>
    );

    const renderContent = () => {
        if (!data) return null;

        switch (type) {
            case 'single':
                return renderSinglePO(data as PurchaseOrder);
            case 'bulk':
                return renderBulkPOs(data as PurchaseOrder[]);
            case 'items':
                return renderItemsOnly(data as PurchaseOrder);
            default:
                return null;
        }
    };

    return (
        <Modal
            title={title || "Print Preview"}
            open={visible}
            onCancel={onClose}
            width="90%"
            style={{ top: 20 }}
            footer={
                <Space>
                    <Button icon={<CloseOutlined />} onClick={onClose}>
                        Close
                    </Button>
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                        Print
                    </Button>
                </Space>
            }
        >
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                <style>{`
                    @media print {
                        .ant-modal-mask,
                        .ant-modal-wrap,
                        .ant-modal-header,
                        .ant-modal-footer {
                            display: none !important;
                        }
                        .ant-modal-content {
                            box-shadow: none !important;
                            border: none !important;
                        }
                        .print-content {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                        }
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                    }
                `}</style>
                {renderContent()}
            </div>
        </Modal>
    );
};

export default PrintPreviewModal;