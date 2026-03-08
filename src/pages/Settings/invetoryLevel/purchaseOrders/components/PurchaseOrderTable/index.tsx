import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Flex,
  Modal,
  Progress,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MoreOutlined,
  PrinterOutlined,
  ReloadOutlined,
  StopOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType, ParamsType } from "@ant-design/pro-components";
import { PurchaseOrder, PurchaseOrderItem } from "../../types";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";
import AddEditPurchaseOrderModal from "../AddEditPurchaseOrderModal";
import CreateDeliveryFromPOModal from "../../../../../../components/MODALS/pro/CreateDeliveryFromPOModal";

const { Text, Title } = Typography;

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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
  pending: { icon: <ClockCircleOutlined />, color: "#f59e0b", text: "Pending", bg: "#fffbeb" },
  approved: { icon: <CheckCircleOutlined />, color: "#10b981", text: "Approved", bg: "#f0fdf4" },
  partially_delivered: { icon: <TruckOutlined />, color: "#3b82f6", text: "Partial", bg: "#eff6ff" },
  fully_delivered: { icon: <CheckCircleOutlined />, color: "#10b981", text: "Delivered", bg: "#f0fdf4" },
  cancelled: { icon: <StopOutlined />, color: "#ef4444", text: "Cancelled", bg: "#fef2f2" },
};

const renderStatus = (status: string) => {
  const cfg = STATUS_CONFIG[status] || { icon: null, color: "#64748b", text: status, bg: "#f1f5f9" };
  return (
    <Tag
      icon={cfg.icon}
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
      }}
    >
      {cfg.text}
    </Tag>
  );
};

const renderDelivery = (record: PurchaseOrder) => (
  <Space direction="vertical" size={2} style={{ width: "100%" }}>
    <Progress
      percent={record.delivery_percentage || 0}
      size="small"
      status={record.delivery_percentage === 100 ? "success" : "active"}
      strokeColor={
        record.delivery_percentage === 100
          ? "#10b981"
          : record.delivery_percentage && record.delivery_percentage > 50
            ? "#3b82f6"
            : "#f59e0b"
      }
    />
    <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", display: "block" }}>
      {record.delivery_percentage || 0}% complete
    </Text>
  </Space>
);

const renderExpectedDate = (dateString: string) => {
  if (!dateString) return <Text type="secondary" style={{ fontSize: 12 }}>Not set</Text>;
  const date = new Date(dateString);
  const today = new Date();
  const isOverdue = date < today && date.toDateString() !== today.toDateString();
  return (
    <Tag
      style={{
        background: isOverdue ? "#fef2f2" : "#eff6ff",
        color: isOverdue ? "#ef4444" : "#3b82f6",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {date.toLocaleDateString()}
    </Tag>
  );
};

// ── Expanded row detail ───────────────────────────────────────────────────────
// ── Info pill (label + value) ─────────────────────────────────────────────────
const InfoPill: React.FC<{ label: string; value: React.ReactNode; color?: string; bg?: string }> = ({
  label, value, color = "#374151", bg = "#f8fafc",
}) => (
  <div style={{ background: bg, borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600 }}>
      {label}
    </Text>
    <Text style={{ fontSize: 12, color, fontWeight: 500, wordBreak: "break-word" }}>
      {value}
    </Text>
  </div>
);

// ── Expanded row detail ───────────────────────────────────────────────────────
const ExpandedRow: React.FC<{ record: PurchaseOrder; isMobile?: boolean }> = ({ record, isMobile }) => {
  const totalOrderValue = (record.po_items || []).reduce(
    (sum, item) => sum + (item.quantity_ordered || 0) * (item.unit_price || 0), 0
  );

  return (
    <div
      style={{
        padding: isMobile ? "12px 4px 4px" : "14px 16px",
        background: "#f8fafc",
        borderTop: "1px solid #f1f5f9",
      }}
    >
      {/* Section label */}
      <Text style={{
        fontSize: 10, color: "#94a3b8", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px",
        display: "block", marginBottom: 10,
      }}>
        Order Details
      </Text>

      {/* Meta info grid — wraps on mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
        marginBottom: 14,
      }}>
        <InfoPill label="Supplier" value={record.supplier_id?.name || "N/A"} />
        {record.supplier_id?.contact && (
          <InfoPill label="Contact" value={record.supplier_id.contact} />
        )}
        <InfoPill
          label="Created"
          value={new Date(record.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
        />
        <InfoPill label="Created By" value={record.created_by?.name || "System"} />
        <InfoPill
          label="Items"
          value={`${record.po_items?.length || 0} item${record.po_items?.length !== 1 ? "s" : ""}`}
          color="#6366f1"
          bg="#eef2ff"
        />
        <InfoPill
          label="Order Value"
          value={`Ksh ${fmtK(totalOrderValue)}`}
          color="#10b981"
          bg="#f0fdf4"
        />
      </div>

      {/* Notes */}
      {record.notes && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 10, color: "#92400e", fontWeight: 600, display: "block", marginBottom: 2 }}>
            NOTES
          </Text>
          <Text style={{ fontSize: 12, color: "#374151" }}>{record.notes}</Text>
        </div>
      )}

      {/* Items section label */}
      <Text style={{
        fontSize: 10, color: "#94a3b8", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px",
        display: "block", marginBottom: 8,
      }}>
        Items ({record.po_items?.length || 0})
      </Text>

      {/* Items — card per item (works on all screen widths) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(record.po_items || []).length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12, padding: "12px 0", display: "block" }}>
            No items in this order
          </Text>
        ) : (
          (record.po_items || []).map((item, index) => {
            const lineTotal = (item.quantity_ordered || 0) * (item.unit_price || 0);
            const received = item.quantity_received || 0;
            const pending = (item.quantity_ordered || 0) - received;
            const pct = item.quantity_ordered ? Math.round((received / item.quantity_ordered) * 100) : 0;
            const isFullyDelivered = received >= item.quantity_ordered;

            return (
              <div
                key={item._id || index}
                style={{
                  background: "#fff",
                  border: `1px solid ${isFullyDelivered ? "#bbf7d0" : "#e2e8f0"}`,
                  borderRadius: 9,
                  padding: "10px 12px",
                  borderLeft: `3px solid ${isFullyDelivered ? "#10b981" : pending === item.quantity_ordered ? "#ef4444" : "#f59e0b"}`,
                }}
              >
                {/* Item name + line total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>
                      {item.inventory_id?.name || "Unknown item"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                      {item.unit_id?.name || "—"} · Ksh {fmtK(item.unit_price)} / unit
                    </Text>
                  </div>
                  <div style={{
                    background: "#f0fdf4",
                    borderRadius: 7,
                    padding: "4px 9px",
                    textAlign: "right",
                    flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Total</Text>
                    <Text strong style={{ fontSize: 13, color: "#10b981" }}>
                      Ksh {fmtK(lineTotal)}
                    </Text>
                  </div>
                </div>

                {/* Quantity stats grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                  marginBottom: 8,
                }}>
                  {[
                    { label: "Ordered", value: item.quantity_ordered, color: "#3b82f6", bg: "#eff6ff" },
                    { label: "Received", value: received, color: "#10b981", bg: "#f0fdf4" },
                    { label: "Pending", value: pending, color: pending > 0 ? "#f59e0b" : "#10b981", bg: pending > 0 ? "#fffbeb" : "#f0fdf4" },
                  ].map((stat) => (
                    <div key={stat.label} style={{ background: stat.bg, borderRadius: 6, padding: "5px 6px", textAlign: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: 700, color: stat.color, display: "block" }}>
                        {stat.value}
                      </Text>
                      <Text style={{ fontSize: 9, color: "#94a3b8" }}>{stat.label}</Text>
                    </div>
                  ))}
                </div>

                {/* Delivery progress */}
                <Progress
                  percent={pct}
                  size="small"
                  status={isFullyDelivered ? "success" : "active"}
                  strokeColor={isFullyDelivered ? "#10b981" : pct > 50 ? "#3b82f6" : "#f59e0b"}
                  format={(p) => (
                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>{p}%</Text>
                  )}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Total row */}
      {(record.po_items || []).length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
          padding: "10px 12px",
          background: "#f1f5f9",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
            ORDER TOTAL
          </Text>
          <Text strong style={{ fontSize: 15, color: "#6c1c2c" }}>
            Ksh {fmtK(record.total_amount || totalOrderValue)}
          </Text>
        </div>
      )}
    </div>
  );
};

// ── Action cell ───────────────────────────────────────────────────────────────
const ActionCell: React.FC<{
  record: PurchaseOrder;
  actionRef: React.RefObject<ActionType>;
  onPrintPO: (record: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  handleStatusUpdate: (params: ParamsType) => void;
  isMobile?: boolean;
}> = ({ record, actionRef, onPrintPO, onDeletePO, handleStatusUpdate, isMobile }) => {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  return (
    <>
      <Dropdown
        disabled={record.status === "cancelled"}
        menu={{
          items: [
            {
              key: "print",
              icon: <PrinterOutlined />,
              label: "Print PO",
              onClick: () => onPrintPO(record),
            },
            ...(record.status === "approved" || record.status === "partially_delivered"
              ? [
                {
                  key: "create-delivery",
                  icon: <CarOutlined />,
                  label: "Create Delivery",
                  onClick: () => setShowDeliveryModal(true),
                },
              ]
              : []),
            ...(record.status === "pending"
              ? [
                {
                  key: "approve",
                  icon: <CheckCircleOutlined />,
                  label: "Approve",
                  onClick: () => handleStatusUpdate({ id: record._id, status: "approved" }),
                },
                {
                  key: "cancel",
                  icon: <StopOutlined />,
                  label: "Cancel",
                  danger: true,
                  onClick: () => handleStatusUpdate({ id: record._id, status: "cancelled" }),
                },
              ]
              : []),
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "Delete",
              danger: true,
              onClick: () => onDeletePO(record._id),
            },
          ],
        }}
        trigger={["hover", "click"]}
        placement={isMobile ? "topRight" : "bottomRight"}
      >
        <Button
          type="text"
          icon={<MoreOutlined />}
          style={{
            borderRadius: 7,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            width: isMobile ? 36 : 32,
            height: isMobile ? 36 : 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        />
      </Dropdown>

      <AddEditPurchaseOrderModal
        actionRef={actionRef}
        data={record}
        edit
        key={`edit-PO-${record._id}`}
      />

      {showDeliveryModal && (
        <CreateDeliveryFromPOModal
          actionRef={actionRef}
          purchaseOrder={record}
          open={showDeliveryModal}
          onCancel={() => setShowDeliveryModal(false)}
        />
      )}
    </>
  );
};

// ── Mobile PO card ────────────────────────────────────────────────────────────
const POCard: React.FC<{
  record: PurchaseOrder;
  actionRef: React.RefObject<ActionType>;
  onPrintPO: (record: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  handleStatusUpdate: (params: ParamsType) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({ record, actionRef, onPrintPO, onDeletePO, handleStatusUpdate, expanded, onToggleExpand }) => {
  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG["pending"];
  const isOverdue =
    record.expected_delivery_date &&
    new Date(record.expected_delivery_date) < new Date();

  return (
    <Card
      style={{
        borderRadius: 12,
        marginBottom: 10,
        border: `1px solid ${record.status === "cancelled" ? "#fca5a5" : "#e2e8f0"}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        opacity: record.status === "cancelled" ? 0.75 : 1,
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={8} style={{ marginBottom: 4 }}>
            <Tag
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "none",
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 700,
                padding: "1px 7px",
              }}
            >
              {record.po_number}
            </Tag>
            {renderStatus(record.status)}
          </Space>
          <Text style={{ fontSize: 13, color: "#374151", display: "block" }}>
            {record.supplier_id?.name || "No supplier"}
          </Text>
          {record.expected_delivery_date && (
            <Text style={{ fontSize: 11, color: isOverdue ? "#ef4444" : "#94a3b8" }}>
              Due: {new Date(record.expected_delivery_date).toLocaleDateString()}
              {isOverdue && " · Overdue"}
            </Text>
          )}
        </div>
        <ActionCell
          record={record}
          actionRef={actionRef}
          onPrintPO={onPrintPO}
          onDeletePO={onDeletePO}
          handleStatusUpdate={handleStatusUpdate}
          isMobile
        />
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            background: "#f0fdf4",
            borderRadius: 8,
            padding: "7px 10px",
          }}
        >
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Amount</Text>
          <Text strong style={{ fontSize: 14, color: "#10b981" }}>
            Ksh {fmtK(record.total_amount)}
          </Text>
        </div>
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 8,
            padding: "7px 10px",
          }}
        >
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Delivery</Text>
          {renderDelivery(record)}
        </div>
      </div>

      {/* Expand toggle */}
      <Button
        type="text"
        size="small"
        onClick={onToggleExpand}
        style={{
          width: "100%",
          height: 28,
          fontSize: 12,
          color: "#64748b",
          background: "#f8fafc",
          borderRadius: 6,
          border: "1px solid #f1f5f9",
        }}
      >
        {expanded ? "Hide details ↑" : "View items & details ↓"}
      </Button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 10 }}>
          <ExpandedRow record={record} isMobile />
        </div>
      )}
    </Card>
  );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobilePOList: React.FC<{
  actionRef: React.RefObject<ActionType>;
  onPrintPO: (record: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  onGenerateSummary: () => void;
  onExportToExcel: (data: PurchaseOrder[]) => void;
  onExportToPDF: (data: PurchaseOrder[]) => void;
  fetchPurchaseOrders: any;
  deletePurchaseOrder: any;
  updateStatus: any;
}> = ({
  actionRef,
  onPrintPO,
  onDeletePO,
  onGenerateSummary,
  onExportToExcel,
  onExportToPDF,
  fetchPurchaseOrders,
  deletePurchaseOrder,
  updateStatus,
}) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const loadOrders = useCallback(async () => {
      setLoading(true);
      try {
        const { data } = await fetchPurchaseOrders({ current: 1, pageSize: 100 });
        setOrders(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { loadOrders(); }, []);

    const handleStatusUpdate = async (params: ParamsType) => {
      const { success } = await updateStatus(params);
      if (success) loadOrders();
    };

    const handleDeletePO = async (id: string) => {
      Modal.confirm({
        title: "Delete Purchase Order?",
        content: "This action cannot be undone.",
        okText: "Delete",
        okButtonProps: { danger: true },
        onOk: async () => {
          const { success } = await deletePurchaseOrder(id);
          if (success) loadOrders();
        },
      });
    };

    const filtered = orders.filter(
      (o) =>
        !searchText ||
        o.po_number?.toLowerCase().includes(searchText.toLowerCase()) ||
        o.supplier_id?.name?.toLowerCase().includes(searchText.toLowerCase())
    );

    const totalValue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const pendingCount = orders.filter((o) => o.status === "pending").length;

    return (
      <div>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input
            placeholder="Search POs…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              padding: "0 12px",
              fontSize: 13,
              outline: "none",
              color: "#0f172a",
              background: "#f8fafc",
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={loadOrders}
            loading={loading}
            style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }}
          />
          <Dropdown
            menu={{
              items: [
                { key: "excel", label: "Export Excel", icon: <FileExcelOutlined />, onClick: () => onExportToExcel(orders) },
                { key: "pdf", label: "Export PDF", icon: <FilePdfOutlined />, onClick: () => onExportToPDF(orders) },
                { key: "summary", label: "Generate Summary", icon: <FileTextOutlined />, onClick: onGenerateSummary },
              ],
            }}
          >
            <Button icon={<FileTextOutlined />} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
          </Dropdown>
          <AddEditPurchaseOrderModal key="add-PO" actionRef={actionRef} />
        </div>

        {/* Summary strip */}
        {!loading && orders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {[
              { label: "Total POs", value: orders.length, color: "#6366f1", bg: "#eef2ff" },
              { label: "Pending", value: pendingCount, color: pendingCount > 0 ? "#f59e0b" : "#10b981", bg: pendingCount > 0 ? "#fffbeb" : "#f0fdf4" },
              { label: "Total Value", value: `Ksh ${fmtK(totalValue)}`, color: "#10b981", bg: "#f0fdf4" },
            ].map((s, i) => (
              <div
                key={i}
                style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}
              >
                <Text style={{ fontSize: 13, fontWeight: 700, color: s.color, display: "block" }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }}
              bodyStyle={{ padding: 14 }}
            >
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Empty description="No purchase orders found" style={{ padding: "40px 0" }} />
        ) : (
          filtered.map((record) => (
            <POCard
              key={record._id}
              record={record}
              actionRef={actionRef}
              onPrintPO={onPrintPO}
              onDeletePO={handleDeletePO}
              handleStatusUpdate={handleStatusUpdate}
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

// ── Props ─────────────────────────────────────────────────────────────────────
interface PurchaseOrderTableProps {
  actionRef?: React.RefObject<ActionType>;
  onDeletePO: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onPrintPO: (record: PurchaseOrder) => void;
  onExportToExcel: (data: PurchaseOrder[]) => void;
  onExportToPDF: (data: PurchaseOrder[]) => void;
  onBulkPrint: () => void;
  onGenerateSummary: () => void;
  onFetchData?: (params: any, sort?: any, filter?: any) => Promise<{ data: PurchaseOrder[]; success: boolean; total: number }>;
}

// ── Main component ────────────────────────────────────────────────────────────
export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  onDeletePO,
  onPrintPO,
  onExportToExcel,
  onExportToPDF,
  onBulkPrint,
  onGenerateSummary,
}) => {
  const [selectedRows, setSelectedRows] = useState<PurchaseOrder[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const actionRef = useRef<ActionType>();

  const { fetchPurchaseOrders, deletePurchaseOrder, updateStatus } = usePurchaseOrders();

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: "Delete Purchase Order?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const { success } = await deletePurchaseOrder(id);
        if (success) actionRef.current?.reload();
      },
    });
  };

  const handleStatusUpdate = async (params: ParamsType) => {
    const { success } = await updateStatus(params);
    if (success) actionRef.current?.reload();
  };

  // ── Mobile ────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobilePOList
        actionRef={actionRef}
        onPrintPO={onPrintPO}
        onDeletePO={onDeletePO}
        onGenerateSummary={onGenerateSummary}
        onExportToExcel={onExportToExcel}
        onExportToPDF={onExportToPDF}
        fetchPurchaseOrders={fetchPurchaseOrders}
        deletePurchaseOrder={deletePurchaseOrder}
        updateStatus={updateStatus}
      />
    );
  }

  // ── Desktop ProTable ──────────────────────────────────────────────────────────
  const selectedRowActions = (
    <Space>
      <Button
        size="small"
        icon={<PrinterOutlined />}
        onClick={onBulkPrint}
        disabled={selectedRows.length === 0}
      >
        Print
      </Button>
      <Button
        size="small"
        icon={<FileExcelOutlined />}
        onClick={() => onExportToExcel(selectedRows)}
        disabled={selectedRows.length === 0}
      >
        Excel
      </Button>
      <Button
        size="small"
        icon={<FilePdfOutlined />}
        onClick={() => onExportToPDF(selectedRows)}
        disabled={selectedRows.length === 0}
      >
        PDF
      </Button>
      <Button
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={() => {
          Modal.confirm({
            title: "Delete Selected?",
            content: `Delete ${selectedRows.length} purchase orders? This cannot be undone.`,
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => {
              selectedRows.forEach((row) => handleDelete(row._id));
              setSelectedRows([]);
            },
          });
        }}
        disabled={selectedRows.length === 0}
      >
        Delete
      </Button>
    </Space>
  );

  return (
    <ProTable<PurchaseOrder>
      rowKey="_id"
      style={{ borderRadius: 12 }}
      headerTitle={
        <Space size={8}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 8,
              padding: "5px 6px",
              color: "#3b82f6",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            <TruckOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>
            Purchase Orders
          </Text>
        </Space>
      }
      search={{
        labelWidth: "auto",
        span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 },
        searchText: "Search",
        resetText: "Reset",
        layout: "vertical",
      }}
      rowSelection={{
        selectedRowKeys: selectedRows.map((r) => r._id),
        onChange: (_: React.Key[], rows: PurchaseOrder[]) => setSelectedRows(rows),
        preserveSelectedRowKeys: true,
      }}
      actionRef={actionRef}
      expandable={{
        expandedRowRender: (record) => <ExpandedRow record={record} />,
        expandedRowKeys,
        onExpand: (expanded, record) =>
          setExpandedRowKeys(
            expanded
              ? [...expandedRowKeys, record._id]
              : expandedRowKeys.filter((k) => k !== record._id)
          ),
      }}
      columns={[
        {
          title: "PO Code",
          dataIndex: "po_number",
          width: 120,
          fixed: "left" as const,
          fieldProps: { placeholder: "Search PO code" },
          render: (text: string) => (
            <Tag
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "none",
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
              }}
            >
              {text}
            </Tag>
          ),
        },
        {
          title: "Supplier",
          dataIndex: ["supplier_id", "name"],
          width: 150,
          search: false,
          ellipsis: true,
          render: (text: string) => (
            <Text style={{ fontSize: 13, color: "#374151" }}>{text || "N/A"}</Text>
          ),
        },
        {
          title: "Status",
          dataIndex: "status",
          align: "center" as const,
          search: false,
          width: 130,
          render: renderStatus,
          filters: [
            { text: "Pending", value: "pending" },
            { text: "Approved", value: "approved" },
            { text: "Partial", value: "partially_delivered" },
            { text: "Delivered", value: "fully_delivered" },
            { text: "Cancelled", value: "cancelled" },
          ],
          onFilter: (value: any, record: PurchaseOrder) => record.status === value,
        },
        {
          title: "Amount",
          dataIndex: "total_amount",
          width: 140,
          search: false,
          sorter: (a: PurchaseOrder, b: PurchaseOrder) => a.total_amount - b.total_amount,
          render: (amount: number) => (
            <Text strong style={{ color: "#10b981", fontSize: 13 }}>
              Ksh {fmtK(amount)}
            </Text>
          ),
        },
        {
          title: "Delivery",
          dataIndex: "delivery_percentage",
          search: false,
          width: 150,
          render: (_: any, record: PurchaseOrder) => renderDelivery(record),
        },
        {
          title: "Expected",
          dataIndex: "expected_delivery_date",
          align: "center" as const,
          width: 130,
          search: false,
          render: renderExpectedDate,
        },
        {
          title: "Actions",
          key: "actions",
          search: false,
          width: 80,
          fixed: "right" as const,
          render: (_: any, record: PurchaseOrder) => (
            <ActionCell
              record={record}
              actionRef={actionRef}
              onPrintPO={onPrintPO}
              onDeletePO={handleDelete}
              handleStatusUpdate={handleStatusUpdate}
            />
          ),
        },
      ]}
      request={async (params, sort, filter) => {
        const { data, total } = await fetchPurchaseOrders({
          ...params,
          sorter: sort,
          ...filter,
        });
        return { data, total, success: true };
      }}
      scroll={{ x: 1100 }}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {range[0]}–{range[1]} of {total} orders
          </Text>
        ),
      }}
      tableAlertRender={({ selectedRowKeys }) =>
        selectedRowKeys.length > 0 ? (
          <Flex justify="space-between" align="center" gap={16}>
            <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text>
            {selectedRowActions}
          </Flex>
        ) : null
      }
      toolBarRender={() => [
        <AddEditPurchaseOrderModal key="add-PO" actionRef={actionRef} />,
        <Button
          key="summary"
          icon={<FileTextOutlined />}
          onClick={onGenerateSummary}
          style={{
            borderRadius: 7,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#374151",
            fontWeight: 500,
          }}
        >
          Summary
        </Button>,
      ]}
      options={{
        density: true,
        fullScreen: true,
        reload: () => actionRef.current?.reload(),
        setting: { draggable: true, checkedReset: true },
      }}
      rowClassName={(record) => {
        if (record.status === "cancelled") return "row-cancelled";
        if (record.delivery_percentage === 100) return "row-delivered";
        return "";
      }}
    />
  );
};

export default PurchaseOrderTable;