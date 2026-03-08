import { useRef, useState, useEffect, useCallback } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
  Image,
  Tooltip,
  Dropdown,
  Typography,
  Card,
  Skeleton,
  Empty,
  Row,
  Col,
  Badge,
} from "antd";
import { deleteInventory, fetchAllInventory } from "@services/inventory";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";
import {
  DeleteOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  SwapOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import React from "react";

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

// ── Render helpers ────────────────────────────────────────────────────────────
const USAGE_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
  selling: { icon: <ShoppingCartOutlined />, color: "#10b981", text: "For Sale", bg: "#f0fdf4" },
  internal: { icon: <ToolOutlined />, color: "#f97316", text: "Internal", bg: "#fff7ed" },
  both: { icon: <SwapOutlined />, color: "#3b82f6", text: "Both", bg: "#eff6ff" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
  active: { icon: <CheckCircleOutlined />, color: "#10b981", text: "Active", bg: "#f0fdf4" },
  inactive: { icon: <StopOutlined />, color: "#64748b", text: "Inactive", bg: "#f1f5f9" },
  discontinued: { icon: <WarningOutlined />, color: "#f59e0b", text: "Discontinued", bg: "#fffbeb" },
};

const renderUsageType = (usageType: string) => {
  const cfg = USAGE_CONFIG[usageType];
  if (!cfg) return <Text type="secondary">—</Text>;
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

const renderStatus = (status: string) => {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Text type="secondary">—</Text>;
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

const renderStockLevel = (record: any) => {
  const { quantity, min_viable_quantity } = record;
  if (!min_viable_quantity) {
    return <Text strong style={{ color: "#3b82f6" }}>{quantity?.toLocaleString()}</Text>;
  }
  const isLow = quantity <= min_viable_quantity;
  const isCritical = quantity <= min_viable_quantity * 0.5;
  return (
    <Space size={4}>
      <Text
        strong
        style={{ color: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#10b981" }}
      >
        {quantity?.toLocaleString()}
      </Text>
      {isLow && (
        <Tooltip title={`Low stock! Min: ${min_viable_quantity}`}>
          <WarningOutlined style={{ color: isCritical ? "#ef4444" : "#f59e0b", fontSize: 12 }} />
        </Tooltip>
      )}
    </Space>
  );
};

const renderPrice = (record: any) => {
  const { price, supplier_price, usage_type } = record;
  if (usage_type === "internal") return <Text type="secondary" style={{ fontSize: 12 }}>N/A</Text>;
  if (!price) return <Text style={{ color: "#ef4444", fontSize: 12 }}>No price</Text>;
  const margin =
    supplier_price && price
      ? (((price - supplier_price) / price) * 100).toFixed(1)
      : null;
  return (
    <Space direction="vertical" size={2}>
      <Text strong style={{ color: "#0f172a" }}>Ksh {fmtK(price)}</Text>
      {supplier_price && (
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>Cost: Ksh {fmtK(supplier_price)}</Text>
      )}
      {margin && (
        <Tag
          style={{
            fontSize: 10,
            padding: "0 5px",
            border: "none",
            borderRadius: 4,
            background:
              parseFloat(margin) > 20 ? "#f0fdf4" : parseFloat(margin) > 10 ? "#fffbeb" : "#fef2f2",
            color:
              parseFloat(margin) > 20 ? "#10b981" : parseFloat(margin) > 10 ? "#f59e0b" : "#ef4444",
          }}
        >
          {margin}% margin
        </Tag>
      )}
    </Space>
  );
};

const ProductThumbnail = ({ src }: { src?: string }) => {
  if (src) {
    return (
      <Image
        width={44}
        height={44}
        src={src}
        style={{ objectFit: "cover", borderRadius: 8 }}
        placeholder={
          <div
            style={{
              width: 44,
              height: 44,
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            <EyeOutlined style={{ color: "#94a3b8" }} />
          </div>
        }
      />
    );
  }
  return (
    <div
      style={{
        width: 44,
        height: 44,
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}
    >
      <AppstoreOutlined style={{ color: "#94a3b8", fontSize: 16 }} />
    </div>
  );
};

// ── Mobile inventory card ─────────────────────────────────────────────────────
interface InventoryCardProps {
  record: any;
  onDelete: (id: string) => void;
  deleting: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
}

const InventoryCard: React.FC<InventoryCardProps> = ({
  record, onDelete, deleting, tableRef,
}) => {
  const { quantity, min_viable_quantity } = record;
  const isLow = min_viable_quantity && quantity <= min_viable_quantity;
  const isCritical = min_viable_quantity && quantity <= min_viable_quantity * 0.5;

  return (
    <Card
      style={{
        borderRadius: 12,
        marginBottom: 10,
        border: isLow ? `1px solid ${isCritical ? "#fca5a5" : "#fde68a"}` : "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <ProductThumbnail src={record.thumbnail} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Text strong style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.3 }}>
              {record.name}
            </Text>
            {renderStatus(record.status)}
          </div>
          {record.code && (
            <code
              style={{
                background: "#f1f5f9",
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: 11,
                color: "#64748b",
                marginTop: 3,
                display: "inline-block",
              }}
            >
              {record.code}
            </code>
          )}
          {record.desc && (
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                display: "block",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {record.desc}
            </Text>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          padding: "8px 10px",
          background: "#f8fafc",
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Stock</Text>
          {renderStockLevel(record)}
          <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record?.unit_id?.name || "units"}</Text>
        </div>
        <div style={{ textAlign: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Price</Text>
          {record.usage_type === "internal" ? (
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>N/A</Text>
          ) : (
            <Text strong style={{ fontSize: 13, color: "#10b981" }}>
              {record.price ? `Ksh ${fmtK(record.price)}` : "—"}
            </Text>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Usage</Text>
          {renderUsageType(record.usage_type)}
        </div>
      </div>

      {/* Category row */}
      {record?.subcategory_id?.name && (
        <div style={{ marginBottom: 8 }}>
          <Tag
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "none",
              borderRadius: 5,
              fontSize: 11,
            }}
          >
            {record.subcategory_id.name}
          </Tag>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <AddEditProInventoryModal actionRef={tableRef} data={record} edit={true} />
        </div>
        <Popconfirm
          title="Delete inventory item?"
          description="This action cannot be undone."
          onConfirm={() => onDelete(record._id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          placement="topRight"
        >
          <Button
            danger
            size="middle"
            icon={<DeleteOutlined />}
            loading={deleting}
            style={{ borderRadius: 8, width: 38, padding: 0 }}
          />
        </Popconfirm>
      </div>
    </Card>
  );
};

// ── Mobile list view ──────────────────────────────────────────────────────────
const MobileInventoryList: React.FC<{
  tableRef: React.MutableRefObject<ActionType | undefined>;
  onExportExcel: () => void;
  onExportPDF: () => void;
}> = ({ tableRef, onExportExcel, onExportPDF }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllInventory({});
      setItems(data);
    } catch {
      message.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, []);

  const deleteMutation = useMutation(deleteInventory, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => { message.success("Item deleted"); setDeletingId(null); loadItems(); },
    onError: () => { message.error("Failed to delete"); setDeletingId(null); },
  });

  const filtered = items.filter((item) =>
    !searchText ||
    item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchText.toLowerCase())
  );

  const lowStockCount = items.filter(
    (i) => i.min_viable_quantity && i.quantity <= i.min_viable_quantity
  ).length;

  const totalValue = items.reduce(
    (s, i) => s + (i.price || 0) * (i.quantity || 0),
    0
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search inventory…"
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
          onClick={loadItems}
          loading={loading}
          style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }}
        />
        <Dropdown
          menu={{
            items: [
              { key: "excel", label: "Export Excel", icon: <FileExcelOutlined />, onClick: onExportExcel },
              { key: "pdf", label: "Export PDF", icon: <FilePdfOutlined />, onClick: onExportPDF },
            ],
          }}
        >
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        </Dropdown>
        <AddEditProInventoryModal actionRef={tableRef} />
      </div>

      {/* Summary strip */}
      {!loading && items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Items", value: items.length, color: "#6366f1", bg: "#eef2ff" },
            {
              label: "Low Stock",
              value: lowStockCount,
              color: lowStockCount > 0 ? "#ef4444" : "#10b981",
              bg: lowStockCount > 0 ? "#fef2f2" : "#f0fdf4",
            },
            {
              label: "Total Value",
              value: `Ksh ${fmtK(totalValue)}`,
              color: "#10b981",
              bg: "#f0fdf4",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: s.bg,
                borderRadius: 8,
                padding: "8px 6px",
                textAlign: "center",
              }}
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
        Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }}
            bodyStyle={{ padding: 14 }}
          >
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : filtered.length === 0 ? (
        <Empty description="No inventory items found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <InventoryCard
            key={record._id}
            record={record}
            onDelete={(id) => deleteMutation.mutate(id)}
            deleting={deletingId === record._id}
            tableRef={tableRef}
          />
        ))
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const InventorySettings = () => {
  const paymentRef = useRef<ActionType>();
  const isMobile = useIsMobile();

  const deleteInventoryMutation = useMutation(deleteInventory, {
    onSuccess: () => { paymentRef.current?.reload(); message.success("Item deleted"); },
    onError: () => message.error("Failed to delete"),
  });

  // ── Export functions ─────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    try {
      const data = await fetchAllInventory({});
      const exportData = data.map((item: any) => ({
        Code: item.code,
        Name: item.name,
        Price: item.price,
        "Supplier Cost": item.supplier_price,
        Subcategory: item.category_id?.name || "",
        Quantity: item.quantity,
        Status: item.min_viable_quantity >= item.quantity ? "Out of Stock" : "In Stock",
        Unit: item.unit_id?.name || "",
        "Min Viable Quantity": item.min_viable_quantity,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      ws["!cols"] = Object.keys(exportData[0] || {}).map(() => ({ wch: 16 }));
      XLSX.writeFile(wb, `inventory_${new Date().toISOString().split("T")[0]}.xlsx`);
      message.success("Excel exported");
    } catch {
      message.error("Export failed");
    }
  };

  const exportToPDF = async () => {
    try {
      const data = await fetchAllInventory({});
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Inventory Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
      const tableData = data.map((item: any) => [
        item.code,
        item.name,
        `Ksh ${item.price?.toLocaleString()}`,
        `Ksh ${item.supplier_price?.toLocaleString()}`,
        item.category_id?.name || "",
        item.quantity,
        item.min_viable_quantity >= item.quantity ? "Out of Stock" : "In Stock",
        item.unit_id?.name || "",
      ]);
      (doc as any).autoTable({
        head: [["Code", "Name", "Price", "Cost", "Category", "Qty", "Status", "Unit"]],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      doc.save(`inventory_${new Date().toISOString().split("T")[0]}.pdf`);
      message.success("PDF exported");
    } catch {
      message.error("Export failed");
    }
  };

  const exportMenuItems = [
    { key: "excel", label: "Export to Excel", icon: <FileExcelOutlined />, onClick: exportToExcel },
    { key: "pdf", label: "Export to PDF", icon: <FilePdfOutlined />, onClick: exportToPDF },
  ];

  // ── Mobile layout ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Space align="center" size={10}>
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: 9,
                padding: "7px 8px",
                color: "#10b981",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              <AppstoreOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                Product Inventory
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                Stock levels, pricing & status
              </Text>
            </div>
          </Space>
        </div>
        <MobileInventoryList
          tableRef={paymentRef}
          onExportExcel={exportToExcel}
          onExportPDF={exportToPDF}
        />
      </div>
    );
  }

  // ── Desktop ProTable ──────────────────────────────────────────────────────────
  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    width: 140,
    fixed: "right" as const,
    render: (_: any, record: any) => (
      <Space size={6}>
        <AddEditProInventoryModal actionRef={paymentRef} data={record} edit={true} />
        <Popconfirm
          title="Delete inventory item?"
          description="This action cannot be undone."
          onConfirm={() => deleteInventoryMutation.mutate(record._id)}
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
  };

  return (
    <ProTable
      rowKey="_id"
      cardBordered
      style={{ borderRadius: 12 }}
      scroll={{ x: 1200 }}
      pagination={{
        pageSize: 10,
        showQuickJumper: true,
        showSizeChanger: true,
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {range[0]}–{range[1]} of {total} items
          </Text>
        ),
      }}
      columns={[
        {
          title: "Image",
          dataIndex: "thumbnail",
          hideInSearch: true,
          width: 70,
          render: (_: any, record: any) => <ProductThumbnail src={record.thumbnail} />,
        },
        {
          title: "Code",
          dataIndex: "code",
          hideInSearch: false,
          width: 110,
          sorter: true,
          fieldProps: { placeholder: "Enter code" },
          render: (text: any) => (
            <code
              style={{
                background: "#f1f5f9",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              {text}
            </code>
          ),
        },
        {
          title: "Product Name",
          dataIndex: "name",
          hideInSearch: false,
          fixed: "left" as const,
          sorter: true,
          ellipsis: true,
          fieldProps: { placeholder: "Search name" },
          render: (text: any, record: any) => (
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{text}</Text>
              {record.desc && (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    display: "block",
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {record.desc}
                </Text>
              )}
            </Space>
          ),
        },
        {
          title: "Category",
          dataIndex: "subcategory_id",
          hideInSearch: true,
          width: 120,
          render: (_: any, record: any) =>
            record?.subcategory_id?.name ? (
              <Tag
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "none",
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                {record.subcategory_id.name}
              </Tag>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
            ),
        },
        {
          title: "Usage",
          dataIndex: "usage_type",
          hideInSearch: true,
          width: 110,
          render: (_: any, record: any) => renderUsageType(record.usage_type),
          filters: [
            { text: "For Sale", value: "selling" },
            { text: "Internal", value: "internal" },
            { text: "Both", value: "both" },
          ],
        },
        {
          title: "Stock",
          dataIndex: "quantity",
          hideInSearch: true,
          width: 130,
          sorter: true,
          render: (_: any, record: any) => (
            <Space direction="vertical" size={2}>
              {renderStockLevel(record)}
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                {record?.unit_id?.name || "units"}
              </Text>
              {record.min_viable_quantity && (
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  Min: {record.min_viable_quantity}
                </Text>
              )}
            </Space>
          ),
        },
        {
          title: "Pricing",
          dataIndex: "price",
          hideInSearch: true,
          width: 130,
          render: (_: any, record: any) => renderPrice(record),
        },
        {
          title: "Status",
          dataIndex: "status",
          hideInSearch: true,
          width: 110,
          render: (_: any, record: any) => renderStatus(record.status),
          filters: [
            { text: "Active", value: "active" },
            { text: "Inactive", value: "inactive" },
            { text: "Discontinued", value: "discontinued" },
          ],
        },
        actionColumn,
      ]}
      request={async (params, sort, filter) => {
        try {
          const queryParams = {
            ...params,
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            ...(sort && Object.keys(sort).length > 0 && {
              sortField: Object.keys(sort)[0],
              sortOrder: Object.values(sort)[0] === "ascend" ? "asc" : "desc",
            }),
            ...(filter && Object.keys(filter).length > 0 && { ...filter }),
          };
          const data = await fetchAllInventory(queryParams);
          return { data, success: true, total: data.length };
        } catch {
          message.error("Failed to fetch inventory");
          return { data: [], success: false, total: 0 };
        }
      }}
      tableAlertRender={({ selectedRowKeys, selectedRows }: any) => {
        const totalValue = selectedRows.reduce(
          (sum: number, row: any) => sum + (row.price || 0) * (row.quantity || 0),
          0
        );
        return (
          <Space>
            <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} items selected</Text>
            {totalValue > 0 && (
              <Text style={{ fontSize: 13 }}>
                Value:{" "}
                <Text strong style={{ color: "#10b981" }}>
                  Ksh {fmtK(totalValue)}
                </Text>
              </Text>
            )}
          </Space>
        );
      }}
      actionRef={paymentRef}
      rowSelection={{ alwaysShowAlert: true }}
      search={{
        searchText: "Search",
        resetText: "Reset",
        labelWidth: "auto",
        collapsed: false,
      }}
      dateFormatter="string"
      headerTitle={
        <Space size={8}>
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: 8,
              padding: "5px 6px",
              color: "#10b981",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            <AppstoreOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>
            Product Inventory
          </Text>
        </Space>
      }
      toolBarRender={() => [
        <AddEditProInventoryModal actionRef={paymentRef} key="add" />,
        <Dropdown key="export" menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button
            icon={<DownloadOutlined />}
            style={{
              borderRadius: 7,
              fontWeight: 500,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#374151",
            }}
          >
            Export
          </Button>
        </Dropdown>,
      ]}
      options={{
        setting: { listsHeight: 400 },
        reload: true,
        density: true,
        fullScreen: true,
      }}
    />
  );
};

export default InventorySettings;