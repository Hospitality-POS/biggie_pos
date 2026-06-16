import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Popconfirm,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Table,
  Typography,
} from "antd";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { deleteDelivery, fetchAllDeliveries } from "@services/deliveries";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PhoneOutlined,
  ReloadOutlined,
  TruckOutlined,
  UserOutlined,
  InboxOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import ExpandedDeliveryItems from "./ExpandedDeliveryItems";
import AcceptDeliveryModal from "@components/MODALS/pro/AcceptDeliveryModal";
import { useMutation } from "@tanstack/react-query";

const { Text, Title } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  blue: "#3b82f6",
  indigo: "#6366f1",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
};

const fmtK = (v: number) => v.toLocaleString("en-KE", { minimumFractionDigits: 0 });

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Display helpers ───────────────────────────────────────────────────────────────
const displayDeliveredBy = (record: any) => {
  const isCustomerDirection = record.direction === 'customer';
  const deliveredBy = record.delivered_by;
  
  if (isCustomerDirection) {
    // Customer delivery: delivered_by is ObjectId (employee)
    if (typeof deliveredBy === 'object' && deliveredBy?.fullname) {
      return deliveredBy.fullname;
    }
    if (typeof deliveredBy === 'string' && record.delivered_by_user?.fullname) {
      return record.delivered_by_user.fullname;
    }
    return "—";
  } else {
    // Supplier delivery: delivered_by is string (driver name)
    return deliveredBy || "—";
  }
};

const displayReceivedBy = (record: any) => {
  const isCustomerDirection = record.direction === 'customer';
  const receivedBy = record.received_by;
  
  if (isCustomerDirection) {
    // Customer delivery: received_by is string (customer name)
    return receivedBy || "—";
  } else {
    // Supplier delivery: received_by is ObjectId (employee)
    if (typeof receivedBy === 'object' && receivedBy?.fullname) {
      return receivedBy.fullname;
    }
    if (typeof receivedBy === 'string' && record.received_by_user?.fullname) {
      return record.received_by_user.fullname;
    }
    return "—";
  }
};

// ── Direction tag ────────────────────────────────────────────────────────────────
const DeliveryDirectionTag: React.FC<{ direction?: string }> = ({ direction }) => {
  const isSupplier = direction !== 'customer';
  return (
    <Tag
      icon={isSupplier ? <InboxOutlined /> : <UserOutlined />}
      style={{
        background: isSupplier ? "#eff6ff" : "#f0fdf4",
        color: isSupplier ? "#1d4ed8" : "#10b981",
        border: "none",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
      }}
    >
      {isSupplier ? "Supplier" : "Customer"}
    </Tag>
  );
};

// ── Status tag ────────────────────────────────────────────────────────────────
const DeliveryStatusTag: React.FC<{ status: boolean }> = ({ status }) => (
  <Tag
    icon={status ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
    style={{
      background: status ? "#f0fdf4" : "#fffbeb",
      color: status ? C.green : C.orange,
      border: "none",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 500,
      padding: "2px 8px",
    }}
  >
    {status ? "Delivered" : "Pending"}
  </Tag>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; copyable?: boolean }> = ({
  icon, label, value, copyable,
}) => (
  <Space size={6}>
    <span style={{ color: "#94a3b8", fontSize: 11 }}>{icon}</span>
    <Text style={{ fontSize: 12, color: "#374151" }}>
      <Text style={{ fontSize: 11, color: "#94a3b8" }}>{label}: </Text>
      {copyable ? (
        <Text copyable style={{ fontSize: 12, color: "#374151" }}>{value}</Text>
      ) : value}
    </Text>
  </Space>
);

// ── Mobile delivery card ──────────────────────────────────────────────────────
interface DeliveryCardProps {
  record: any;
  onDelete: (id: string) => void;
  deleting: boolean;
  deliveryRef: React.MutableRefObject<ActionType | undefined>;
  expanded: boolean;
  onToggleExpand: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  record, onDelete, deleting, deliveryRef, expanded, onToggleExpand,
}) => {
  const isDelivered = record.delivery_status;
  const itemCount = record.delivery_items?.length || 0;
  const totalAmount = record.delivery_items?.reduce(
    (acc: number, item: any) => acc + (item.supplier_price || 0) * (item.quantity || 0), 0
  ) || 0;

  return (
    <Card
      style={{
        borderRadius: 12,
        marginBottom: 10,
        border: `1px solid ${isDelivered ? "#bbf7d0" : "#fde68a"}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={6} style={{ marginBottom: 5, flexWrap: "wrap" }}>
            <Tag style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
              {record.code || "—"}
            </Tag>
            <DeliveryDirectionTag direction={record.direction} />
            <DeliveryStatusTag status={isDelivered} />
          </Space>
          <Text style={{ fontSize: 13, color: C.subText }}>
            {record.direction === 'customer' 
              ? (record.customer_id?.customer_name || "No customer")
              : (record.supplier_id?.name || "No supplier")}
          </Text>
        </div>
        {/* Status icon bubble */}
        <div
          style={{
            background: isDelivered ? "#f0fdf4" : "#fffbeb",
            borderRadius: 8,
            padding: "6px 7px",
            color: isDelivered ? C.green : C.orange,
            fontSize: 15,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <TruckOutlined />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ background: "#eef2ff", borderRadius: 8, padding: "7px 10px" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Items</Text>
          <Text strong style={{ fontSize: 15, color: C.indigo }}>{itemCount}</Text>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "7px 10px" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Total Value</Text>
          <Text strong style={{ fontSize: 13, color: C.green }}>Ksh {fmtK(totalAmount)}</Text>
        </div>
      </div>

      {/* Info strip */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 10,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {record.direction === 'supplier' && record?.supplier_id?.name && (
          <InfoRow icon={<TruckOutlined />} label="Supplier" value={record.supplier_id.name} />
        )}
        {record.direction === 'customer' && record?.customer_id?.customer_name && (
          <InfoRow icon={<UserOutlined />} label="Customer" value={record.customer_id.customer_name} />
        )}
        {record.direction === 'supplier' && record?.supplier_id?.phone && (
          <InfoRow icon={<PhoneOutlined />} label="Phone" value={record.supplier_id.phone} copyable />
        )}
        {record.direction === 'customer' && record?.customer_id?.phone && (
          <InfoRow icon={<PhoneOutlined />} label="Phone" value={record.customer_id.phone} copyable />
        )}
        {record.delivered_by && (
          <InfoRow icon={<UserOutlined />} label="Delivered by" value={displayDeliveredBy(record)} />
        )}
        {record.direction === 'supplier' && record?.received_by && (
          <InfoRow icon={<UserOutlined />} label="Received by" value={displayReceivedBy(record)} />
        )}
        {record.direction === 'customer' && record?.received_by && (
          <InfoRow icon={<UserOutlined />} label="Received by (Customer)" value={displayReceivedBy(record)} />
        )}
        {record?.createdAt && (
          <InfoRow
            icon={<CalendarOutlined />}
            label="Date"
            value={(() => {
              try {
                const date = new Date(record.createdAt);
                if (isNaN(date.getTime())) return "Invalid date";
                return date.toLocaleDateString("en-KE", { dateStyle: "medium" });
              } catch {
                return "Invalid date";
              }
            })()}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <AcceptDeliveryModal actionRef={deliveryRef} data={record} edit />
        </div>
        <Popconfirm
          title="Delete this delivery?"
          description="This action cannot be undone."
          onConfirm={() => onDelete(record._id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          placement="topRight"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            style={{ borderRadius: 8, width: 38, padding: 0 }}
          />
        </Popconfirm>
        <Button
          type="text"
          onClick={onToggleExpand}
          style={{
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "#f8fafc",
            fontSize: 12,
            color: C.subText,
            height: 32,
            padding: "0 10px",
          }}
        >
          {expanded ? "↑ Hide" : "↓ Items"}
        </Button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <ExpandedDeliveryItems record={record} />
        </div>
      )}
    </Card>
  );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileDeliveryList: React.FC<{
  deliveryRef: React.MutableRefObject<ActionType | undefined>;
}> = ({ deliveryRef }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllDeliveries({});
      setItems(data);
    } catch {
      message.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, []);

  const deleteMutation = useMutation(deleteDelivery, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => { message.success("Delivery deleted"); setDeletingId(null); loadItems(); },
    onError: () => { message.error("Failed to delete delivery"); setDeletingId(null); },
  });

  const filtered = items.filter(
    (item) =>
      !searchText ||
      item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.delivered_by?.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.direction === 'supplier' && item.supplier_id?.name?.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.direction === 'customer' && item.customer_id?.customer_name?.toLowerCase().includes(searchText.toLowerCase()))
  );

  const deliveredCount = items.filter((i) => i.delivery_status).length;
  const pendingCount = items.filter((i) => !i.delivery_status).length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search deliveries…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            padding: "0 12px",
            fontSize: 13,
            outline: "none",
            color: C.darkText,
            background: "#f8fafc",
          }}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={loadItems}
          loading={loading}
          style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }}
        />
        <AcceptDeliveryModal edit={false} actionRef={deliveryRef} />
      </div>

      {/* Summary strip */}
      {!loading && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total", value: items.length, color: C.indigo, bg: "#eef2ff" },
            { label: "Delivered", value: deliveredCount, color: C.green, bg: "#f0fdf4" },
            { label: "Pending", value: pendingCount, color: pendingCount > 0 ? C.orange : C.green, bg: pendingCount > 0 ? "#fffbeb" : "#f0fdf4" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        ))
      ) : filtered.length === 0 ? (
        <Empty description="No deliveries found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <DeliveryCard
            key={record._id}
            record={record}
            onDelete={(id) => deleteMutation.mutate(id)}
            deleting={deletingId === record._id}
            deliveryRef={deliveryRef}
            expanded={expandedIds.includes(record._id)}
            onToggleExpand={() =>
              setExpandedIds((prev) =>
                prev.includes(record._id)
                  ? prev.filter((id) => id !== record._id)
                  : [...prev, record._id]
              )
            }
          />
        ))
      )}
    </div>
  );
};

// ── Date-based Delivery Rate Report Component ─────────────────────────────────────
const DeliveryRateReport: React.FC<{ deliveries: any[] }> = ({ deliveries }) => {
  const [activeTab, setActiveTab] = useState('supplier');
  const [supplierDateRange, setSupplierDateRange] = useState<any>(null);
  const [customerDateRange, setCustomerDateRange] = useState<any>(null);
  
  const filterDeliveriesByDateRange = (deliveries: any[], dateRange: any) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return deliveries;
    const [startDate, endDate] = dateRange;
    return deliveries.filter(d => {
      const deliveryDate = new Date(d.createdAt);
      return deliveryDate >= startDate && deliveryDate <= endDate;
    });
  };

  // Separate supplier and customer deliveries
  const supplierDeliveries = deliveries.filter(d => d.direction !== 'customer');
  const customerDeliveries = deliveries.filter(d => d.direction === 'customer');

  // Apply date range filters
  const filteredSupplierDeliveries = filterDeliveriesByDateRange(supplierDeliveries, supplierDateRange);
  const filteredCustomerDeliveries = filterDeliveriesByDateRange(customerDeliveries, customerDateRange);

  // Flatten all delivery items into separate arrays for supplier and customer
  const supplierItems = filteredSupplierDeliveries.flatMap(delivery => 
    (delivery.delivery_items || []).map((item: any) => ({
      deliveryCode: delivery.code || `DN-${delivery._id?.slice(-6).toUpperCase()}`,
      direction: 'Supplier',
      counterparty: delivery.supplier_id?.name || '—',
      itemName: item.inventory_id?.name || 'N/A',
      quantity: item.quantity || 0,
      unit: item.unit_id?.name || '—',
      unitPrice: item.supplier_price || 0,
      totalPrice: (item.supplier_price || 0) * (item.quantity || 0),
      deliveryDate: new Date(delivery.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' }),
      deliveredBy: delivery.delivered_by || '—',
      receivedBy: delivery.received_by || '—',
    }))
  );

  const customerItems = filteredCustomerDeliveries.flatMap(delivery => 
    (delivery.delivery_items || []).map((item: any) => ({
      deliveryCode: delivery.code || `DN-${delivery._id?.slice(-6).toUpperCase()}`,
      direction: 'Customer',
      counterparty: delivery.customer_id?.customer_name || '—',
      itemName: item.inventory_id?.name || 'N/A',
      quantity: item.quantity || 0,
      unit: item.unit_id?.name || '—',
      unitPrice: item.supplier_price || 0,
      totalPrice: (item.supplier_price || 0) * (item.quantity || 0),
      deliveryDate: new Date(delivery.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' }),
      deliveredBy: delivery.delivered_by || '—',
      receivedBy: delivery.received_by || '—',
    }))
  );

  const exportToExcel = (items: any[], type: string) => {
    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${type} Delivery Items`);
    const dateRange = type === 'Supplier' ? supplierDateRange : customerDateRange;
    const dateStr = dateRange && dateRange[0] && dateRange[1]
      ? `${dateRange[0].toISOString().split('T')[0]}_to_${dateRange[1].toISOString().split('T')[0]}`
      : 'all';
    XLSX.writeFile(wb, `${type.toLowerCase()}_delivery_items_${dateStr}.xlsx`);
    message.success(`Exported ${type} delivery items to Excel successfully`);
  };

  const exportToPDF = (items: any[], type: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${type} Delivery Items Report`, 14, 20);
    doc.setFontSize(10);
    const dateRange = type === 'Supplier' ? supplierDateRange : customerDateRange;
    if (dateRange && dateRange[0] && dateRange[1]) {
      doc.text(`Date Range: ${dateRange[0].toLocaleDateString('en-KE', { dateStyle: 'medium' })} to ${dateRange[1].toLocaleDateString('en-KE', { dateStyle: 'medium' })}`, 14, 28);
    } else {
      doc.text(`Date Range: All dates`, 14, 28);
    }
    doc.text(`Total Items: ${items.length}`, 14, 34);

    const tableData = items.map(item => [
      item.deliveryCode,
      item.direction,
      item.counterparty,
      item.itemName,
      item.quantity.toString(),
      item.unit,
      `Ksh ${item.unitPrice.toLocaleString()}`,
      `Ksh ${item.totalPrice.toLocaleString()}`,
      item.deliveryDate,
    ]);

    (doc as any).autoTable({
      head: [['Delivery Code', 'Direction', 'Counterparty', 'Item', 'Qty', 'Unit', 'Unit Price', 'Total', 'Date']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [108, 28, 44] }
    });

    doc.save(`${type.toLowerCase()}_delivery_items_${dateStr}.pdf`);
    message.success(`Exported ${type} delivery items to PDF successfully`);
  };

  const formatDateRangeText = (dateRange: any) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return 'all dates';
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    return `${startDate.toLocaleDateString('en-KE', { dateStyle: 'medium' })} to ${endDate.toLocaleDateString('en-KE', { dateStyle: 'medium' })}`;
  };

  const columns = [
    {
      title: 'Delivery Code',
      dataIndex: 'deliveryCode',
      key: 'deliveryCode',
      width: 120,
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
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
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
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
    },
  ];

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        {
          key: 'supplier',
          label: (
            <Space>
              <InboxOutlined style={{ color: C.blue }} />
              <span>Supplier Deliveries</span>
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
                rowKey={(record, index) => `supplier-${record.deliveryCode}-${index}`}
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
              <UserOutlined style={{ color: C.green }} />
              <span>Customer Deliveries</span>
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
                rowKey={(record, index) => `customer-${record.deliveryCode}-${index}`}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1200 }}
                size="small"
              />
            </div>
          ),
        },
      ]}
    />
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const DeliverySettings = () => {
  const deliveryRef = useRef<ActionType>();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('table');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const deleteDeliveryMutation = useMutation(deleteDelivery, {
    onSuccess: () => { deliveryRef.current?.reload(); message.success("Delivery deleted"); },
    onError: () => message.error("Failed to delete delivery"),
  });

  // Fetch all deliveries for the report
  useEffect(() => {
    const loadDeliveriesForReport = async () => {
      setLoadingDeliveries(true);
      try {
        const data = await fetchAllDeliveries({});
        setDeliveries(data);
      } catch (error) {
        message.error("Failed to load deliveries for report");
      } finally {
        setLoadingDeliveries(false);
      }
    };
    loadDeliveriesForReport();
  }, []);

  // ── Mobile ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Space align="center" size={10}>
            <div
              style={{
                background: "#eff6ff",
                borderRadius: 9,
                padding: "7px 8px",
                color: C.blue,
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              <TruckOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: C.darkText }}>Deliveries</Title>
              <Text style={{ fontSize: 12, color: C.subText }}>Track and manage incoming deliveries</Text>
            </div>
          </Space>
        </div>
        <MobileDeliveryList deliveryRef={deliveryRef} />
      </div>
    );
  }

  // ── Desktop ProTable ────────────────────────────────────────────────────────
  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        {
          key: 'table',
          label: (
            <Space>
              <TruckOutlined />
              <span>Deliveries</span>
            </Space>
          ),
          children: (
            <ProTable
              rowKey="_id"
              cardBordered
              style={{ borderRadius: 12 }}
              headerTitle={
                <Space size={8}>
                  <div
                    style={{
                      background: "#eff6ff",
                      borderRadius: 8,
                      padding: "5px 6px",
                      color: C.blue,
                      fontSize: 15,
                      lineHeight: 1,
                    }}
                  >
                    <TruckOutlined />
                  </div>
                  <Text strong style={{ fontSize: 14, color: C.darkText }}>Deliveries</Text>
                </Space>
              }
              search={{
                labelWidth: "auto",
                filterType: "light",
                searchText: "Search",
                resetText: "Reset",
              }}
              pagination={{
                pageSize: 10,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total, range) => (
                  <Text style={{ fontSize: 12, color: C.subText }}>
                    {range[0]}–{range[1]} of {total} deliveries
                  </Text>
                ),
              }}
              columns={[
                {
                  title: "Delivery Code",
                  dataIndex: "code",
                  sorter: true,
                  fieldProps: { placeholder: "Search delivery code" },
                  render: (text: any) => (
                    <Tag style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                      {text || "—"}
                    </Tag>
                  ),
                },
                {
                  title: "Direction",
                  dataIndex: "direction",
                  width: 100,
                  filters: [
                    { text: "Supplier", value: "supplier" },
                    { text: "Customer", value: "customer" },
                  ],
                  onFilter: (value: any, record: any) => record.direction === value,
                  render: (direction: string) => <DeliveryDirectionTag direction={direction} />,
                },
                {
                  title: "Delivered By",
                  dataIndex: "delivered_by",
                  sorter: true,
                  fieldProps: { placeholder: "Search deliverer" },
                  render: (_: any, record: any) => (
                    <Space size={6}>
                      <UserOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
                      <Text style={{ fontSize: 13, color: "#374151" }}>{displayDeliveredBy(record)}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Counterparty",
                  dataIndex: "supplier_id",
                  hideInSearch: true,
                  render: (_: any, record: any) => {
                    const isSupplier = record.direction !== 'customer';
                    const name = isSupplier 
                      ? record.supplier_id?.name 
                      : record.customer_id?.customer_name;
                    return (
                      <Text style={{ fontSize: 13, color: "#374151" }}>{name || "—"}</Text>
                    );
                  },
                },
                {
                  title: "Contact",
                  dataIndex: "supplier_id",
                  hideInSearch: true,
                  width: 130,
                  render: (_: any, record: any) => {
                    const isSupplier = record.direction !== 'customer';
                    const phone = isSupplier 
                      ? record.supplier_id?.phone 
                      : record.customer_id?.phone;
                    return phone ? (
                      <Typography.Text copyable style={{ fontSize: 12, color: "#374151" }}>
                        {phone}
                      </Typography.Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                    );
                  },
                },
                {
                  title: "Received By",
                  dataIndex: "received_by",
                  hideInSearch: true,
                  render: (_: any, record: any) => {
                    const receivedByValue = displayReceivedBy(record);
                    return receivedByValue !== "—" ? (
                      <Space size={6}>
                        <UserOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
                        <Text style={{ fontSize: 13, color: "#374151" }}>{receivedByValue}</Text>
                      </Space>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                    );
                  },
                },
                {
                  title: "Items",
                  hideInSearch: true,
                  width: 70,
                  align: "center" as const,
                  render: (_: any, record: any) => {
                    const count = record.delivery_items?.length || 0;
                    return (
                      <div style={{ background: "#eef2ff", borderRadius: 6, padding: "2px 10px", display: "inline-block" }}>
                        <Text strong style={{ color: C.indigo, fontSize: 13 }}>{count}</Text>
                      </div>
                    );
                  },
                },
                {
                  title: "Total Value",
                  hideInSearch: true,
                  width: 130,
                  render: (_: any, record: any) => {
                    const total = record.delivery_items?.reduce(
                      (acc: number, item: any) => acc + (item.supplier_price || 0) * (item.quantity || 0), 0
                    ) || 0;
                    return (
                      <Text strong style={{ color: C.green, fontSize: 13 }}>
                {total > 0 ? `Ksh ${fmtK(total)}` : "—"}
                      </Text>
                    );
                  },
                },
                {
                  title: "Status",
                  dataIndex: "delivery_status",
                  hideInSearch: true,
                  width: 120,
                  filters: [
                    { text: "Delivered", value: true },
                    { text: "Pending", value: false },
                  ],
                  onFilter: (value: any, record: any) => record.delivery_status === value,
                  render: (status: boolean) => <DeliveryStatusTag status={status} />,
                },
                {
                  title: "Date",
                  dataIndex: "createdAt",
                  hideInSearch: true,
                  valueType: "dateTime",
                  sorter: true,
                  width: 150,
                  render: (val: any) => (
                    <Space size={4}>
                      <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
                      <Text style={{ fontSize: 12, color: "#374151" }}>
                        {(() => {
                          try {
                            if (!val) return "—";
                            const date = new Date(val);
                            if (isNaN(date.getTime())) return "Invalid date";
                            return date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
                          } catch {
                            return "Invalid date";
                          }
                        })()}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: "Actions",
                  dataIndex: "actions",
                  hideInSearch: true,
                  width: 100,
                  fixed: "right" as const,
                  render: (_: any, record: any) => (
                    <Space size={6}>
                      <AcceptDeliveryModal actionRef={deliveryRef} data={record} edit />
                      <Popconfirm
                        title="Delete this delivery?"
                        description="This action cannot be undone."
                        onConfirm={() => deleteDeliveryMutation.mutate(record._id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          style={{ borderRadius: 6, height: 28, width: 28, padding: 0 }}
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              request={async (params) => {
                const data = await fetchAllDeliveries(params);
                return { data, success: true, total: data.length };
              }}
              actionRef={deliveryRef}
              dateFormatter="string"
              scroll={{ x: 1200 }}
              options={{
                fullScreen: true,
                reload: true,
                density: true,
                setting: true,
              }}
              expandable={{
                expandedRowRender: (record) => <ExpandedDeliveryItems record={record} />,
              }}
              toolBarRender={() => [
                <AcceptDeliveryModal key="add" edit={false} actionRef={deliveryRef} />,
              ]}
            />
          ),
        },
        {
          key: 'report',
          label: (
            <Space>
              <BarChartOutlined />
              <span>Delivery Rate Report</span>
            </Space>
          ),
          children: loadingDeliveries ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Skeleton active />
            </div>
          ) : (
            <DeliveryRateReport deliveries={deliveries} />
          ),
        },
      ]}
    />
  );
};

export default DeliverySettings;