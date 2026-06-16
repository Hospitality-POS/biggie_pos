import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Skeleton, Space, Table, Tabs, Typography, message } from 'antd';
import { BarChartOutlined, DownloadOutlined, InboxOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PrintPreviewModal from './components/PreviewPrintModal';
import { PurchaseOrderTable } from './components/PurchaseOrderTable';
import { usePurchaseOrders } from './hooks/usePurchaseOrders';

const { Text } = Typography;

// ── Date-based Purchase Order Rate Report Component ─────────────────────────────
const PurchaseOrderRateReport: React.FC<{ purchaseOrders: any[] }> = ({ purchaseOrders }) => {
  const [activeTab, setActiveTab] = useState('supplier');
  const [supplierDateRange, setSupplierDateRange] = useState<any>(null);
  const [customerDateRange, setCustomerDateRange] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();
  
  const filterPOsByDateRange = (pos: any[], dateRange: any) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return pos;
    const [startDate, endDate] = dateRange;
    return pos.filter(po => {
      const poDate = new Date(po.createdAt);
      return poDate >= startDate && poDate <= endDate;
    });
  };

  // Separate supplier and customer purchase orders
  const supplierPOs = purchaseOrders.filter(po => po.direction !== 'customer');
  const customerPOs = purchaseOrders.filter(po => po.direction === 'customer');

  // Apply date range filters
  const filteredSupplierPOs = filterPOsByDateRange(supplierPOs, supplierDateRange);
  const filteredCustomerPOs = filterPOsByDateRange(customerPOs, customerDateRange);

  // Flatten all PO items into separate arrays for supplier and customer
  const supplierItems = filteredSupplierPOs.flatMap(po => 
    (po.po_items || []).map((item: any) => ({
      poNumber: po.po_number || 'N/A',
      direction: 'Supplier',
      counterparty: po.supplier_id?.name || '—',
      itemName: item.inventory_id?.name || 'N/A',
      quantityOrdered: item.quantity_ordered || 0,
      quantityReceived: item.quantity_received || 0,
      unit: item.unit_id?.name || '—',
      unitPrice: item.unit_price || 0,
      totalPrice: item.total_price || 0,
      poDate: new Date(po.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' }),
      expectedDelivery: po.expected_delivery_date 
        ? new Date(po.expected_delivery_date).toLocaleDateString('en-KE', { dateStyle: 'medium' })
        : '—',
      status: po.status || '—',
    }))
  );

  const customerItems = filteredCustomerPOs.flatMap(po => 
    (po.po_items || []).map((item: any) => ({
      poNumber: po.po_number || 'N/A',
      direction: 'Customer',
      counterparty: po.customer_id?.customer_name || '—',
      itemName: item.inventory_id?.name || 'N/A',
      quantityOrdered: item.quantity_ordered || 0,
      quantityReceived: item.quantity_received || 0,
      unit: item.unit_id?.name || '—',
      unitPrice: item.unit_price || 0,
      totalPrice: item.total_price || 0,
      poDate: new Date(po.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' }),
      expectedDelivery: po.expected_delivery_date 
        ? new Date(po.expected_delivery_date).toLocaleDateString('en-KE', { dateStyle: 'medium' })
        : '—',
      status: po.status || '—',
    }))
  );

  const exportToExcel = (items: any[], type: string) => {
    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${type} PO Items`);
    const dateRange = type === 'Supplier' ? supplierDateRange : customerDateRange;
    const dateStr = dateRange && dateRange[0] && dateRange[1]
      ? `${dateRange[0].toISOString().split('T')[0]}_to_${dateRange[1].toISOString().split('T')[0]}`
      : 'all';
    XLSX.writeFile(wb, `${type.toLowerCase()}_po_items_${dateStr}.xlsx`);
    messageApi.success(`Exported ${type} PO items to Excel successfully`);
  };

  const exportToPDF = (items: any[], type: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${type} Purchase Order Items Report`, 14, 20);
    doc.setFontSize(10);
    const dateRange = type === 'Supplier' ? supplierDateRange : customerDateRange;
    if (dateRange && dateRange[0] && dateRange[1]) {
      doc.text(`Date Range: ${dateRange[0].toLocaleDateString('en-KE', { dateStyle: 'medium' })} to ${dateRange[1].toLocaleDateString('en-KE', { dateStyle: 'medium' })}`, 14, 28);
    } else {
      doc.text(`Date Range: All dates`, 14, 28);
    }
    doc.text(`Total Items: ${items.length}`, 14, 34);

    const tableData = items.map(item => [
      item.poNumber,
      item.direction,
      item.counterparty,
      item.itemName,
      item.quantityOrdered.toString(),
      item.quantityReceived.toString(),
      item.unit,
      `Ksh ${item.unitPrice.toLocaleString()}`,
      `Ksh ${item.totalPrice.toLocaleString()}`,
      item.poDate,
    ]);

    (doc as any).autoTable({
      head: [['PO Number', 'Direction', 'Counterparty', 'Item', 'Ordered', 'Received', 'Unit', 'Unit Price', 'Total', 'Date']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [108, 28, 44] }
    });

    doc.save(`${type.toLowerCase()}_po_items_${dateStr}.pdf`);
    messageApi.success(`Exported ${type} PO items to PDF successfully`);
  };

  const formatDateRangeText = (dateRange: any) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return 'all dates';
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    return `${startDate.toLocaleDateString('en-KE', { dateStyle: 'medium' })} to ${endDate.toLocaleDateString('en-KE', { dateStyle: 'medium' })}`;
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      width: 100,
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
    },
    {
      title: 'Counterparty',
      dataIndex: 'counterparty',
      key: 'counterparty',
      width: 150,
    },
    {
      title: 'Item',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 150,
    },
    {
      title: 'Ordered',
      dataIndex: 'quantityOrdered',
      key: 'quantityOrdered',
      width: 70,
      align: 'right' as const,
    },
    {
      title: 'Received',
      dataIndex: 'quantityReceived',
      key: 'quantityReceived',
      width: 70,
      align: 'right' as const,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => `Ksh ${val.toLocaleString()}`,
    },
    {
      title: 'Total',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => `Ksh ${val.toLocaleString()}`,
    },
    {
      title: 'Date',
      dataIndex: 'poDate',
      key: 'poDate',
      width: 120,
    },
  ];

  return (
    <>
      {contextHolder}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'supplier',
            label: (
              <Space>
                <InboxOutlined style={{ color: '#3b82f6' }} />
                <span>Supplier POs</span>
              </Space>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space size={12}>
                    <DatePicker.RangePicker
                      placeholder={['Start date', 'End date']}
                      onChange={setSupplierDateRange}
                      style={{ borderRadius: 8 }}
                    />
                    <Text type="secondary">
                      Showing {supplierItems.length} supplier item{supplierItems.length !== 1 ? 's' : ''}
                      {supplierDateRange && ` for ${formatDateRangeText(supplierDateRange)}`}
                    </Text>
                  </Space>
                  <Space>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(supplierItems, 'Supplier')}>
                      Export Excel
                    </Button>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToPDF(supplierItems, 'Supplier')}>
                      Export PDF
                    </Button>
                  </Space>
                </div>
                <Table
                  dataSource={supplierItems}
                  columns={columns}
                  rowKey={(record, index) => `supplier-${record.poNumber}-${index}`}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 1200 }}
                  size="small"
                />
              </div>
            ),
          },
          {
            key: 'customer',
            label: (
              <Space>
                <ShoppingCartOutlined style={{ color: '#10b981' }} />
                <span>Customer POs</span>
              </Space>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space size={12}>
                    <DatePicker.RangePicker
                      placeholder={['Start date', 'End date']}
                      onChange={setCustomerDateRange}
                      style={{ borderRadius: 8 }}
                    />
                    <Text type="secondary">
                      Showing {customerItems.length} customer item{customerItems.length !== 1 ? 's' : ''}
                      {customerDateRange && ` for ${formatDateRangeText(customerDateRange)}`}
                    </Text>
                  </Space>
                  <Space>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(customerItems, 'Customer')}>
                      Export Excel
                    </Button>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToPDF(customerItems, 'Customer')}>
                      Export PDF
                    </Button>
                  </Space>
                </div>
                <Table
                  dataSource={customerItems}
                  columns={columns}
                  rowKey={(record, index) => `customer-${record.poNumber}-${index}`}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 1200 }}
                  size="small"
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
};

export const PurchaseOrderSettings = () => {
  const [activeTab, setActiveTab] = useState('table');
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);

  const {
    loading,
    printModal,
    fetchPurchaseOrders,
    deletePurchaseOrder,
    updateStatus,
    exportToExcel,
    exportToPDF,
    showPrintPreview,
    showBulkPrintPreview,
    closePrintModal,
    generateSummary
  } = usePurchaseOrders();

  // Fetch all purchase orders for the report
  useEffect(() => {
    const loadPurchaseOrdersForReport = async () => {
      setLoadingPurchaseOrders(true);
      try {
        const response = await fetchPurchaseOrders({});
        setPurchaseOrders(response.data || []);
      } catch (error) {
        console.error('Failed to load purchase orders for report');
      } finally {
        setLoadingPurchaseOrders(false);
      }
    };
    loadPurchaseOrdersForReport();
  }, [fetchPurchaseOrders]);

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'table',
            label: (
              <Space>
                <ShoppingCartOutlined />
                <span>Purchase Orders</span>
              </Space>
            ),
            children: (
              <PurchaseOrderTable
                loading={loading}
                onFetchData={fetchPurchaseOrders}
                onDeletePO={deletePurchaseOrder}
                onUpdateStatus={updateStatus}
                onPrintPO={showPrintPreview}
                onExportToExcel={exportToExcel}
                onExportToPDF={exportToPDF}
                onBulkPrint={showBulkPrintPreview}
                onGenerateSummary={generateSummary}
              />
            ),
          },
          {
            key: 'report',
            label: (
              <Space>
                <BarChartOutlined />
                <span>PO Rate Report</span>
              </Space>
            ),
            children: loadingPurchaseOrders ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Skeleton active />
              </div>
            ) : (
              <PurchaseOrderRateReport purchaseOrders={purchaseOrders} />
            ),
          },
        ]}
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

export default PurchaseOrderSettings;