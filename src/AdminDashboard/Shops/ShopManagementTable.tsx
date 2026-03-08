import React, { useRef, useMemo, useEffect, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Tooltip,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Badge,
  Skeleton,
  Empty,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  UserAddOutlined,
  CoffeeOutlined,
  ShopOutlined,
  ArrowRightOutlined,
  BranchesOutlined,
  DollarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  EditOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteShop, fetchAllShops } from "@services/shops";
import AddEditShopModal from "@components/MODALS/pro/AddEditShopModal";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Tenant config ─────────────────────────────────────────────────────────────

const useTenantConfig = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled || tenant?.modules?.accounting
  );
  return { isAccountingOnly: hasAccounting && !hasPOS };
};

// ── POS Mode tag ──────────────────────────────────────────────────────────────

const PosModeTag: React.FC<{ mode: string }> = ({ mode }) => {
  const isRetail = mode === "retail";
  return (
    <Tag
      icon={isRetail ? <ShopOutlined /> : <CoffeeOutlined />}
      style={{
        background: isRetail ? "#eff6ff" : "#fff7ed",
        color: isRetail ? "#1d4ed8" : "#c2410c",
        border: "none",
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {isRetail ? "Retail" : "Restaurant"}
    </Tag>
  );
};

// ── Mobile shop card ──────────────────────────────────────────────────────────

interface ShopCardProps {
  record: any;
  isAccountingOnly: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
}

const ShopCard: React.FC<ShopCardProps> = ({
  record, isAccountingOnly, onOpen, onDelete, deleting, tableRef,
}) => (
  <Card
    style={{
      borderRadius: 12,
      marginBottom: 10,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}
    bodyStyle={{ padding: "14px 16px" }}
  >
    {/* Top row: name + mode tag */}
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
      <Space size={8} align="center">
        <div
          style={{
            background: "#fff7ed",
            borderRadius: 8,
            padding: "6px 7px",
            color: "#f97316",
            fontSize: 15,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <ShopOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>
            {record.name}
          </Text>
          {record.location && (
            <Space size={3} style={{ marginTop: 2 }}>
              <EnvironmentOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
              <Text style={{ fontSize: 12, color: "#94a3b8" }}>{record.location}</Text>
            </Space>
          )}
        </div>
      </Space>
      {!isAccountingOnly && record.pos_mode && (
        <PosModeTag mode={record.pos_mode} />
      )}
    </div>

    {/* Stats row */}
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
        padding: "8px 10px",
        background: "#f8fafc",
        borderRadius: 8,
      }}
    >
      <div style={{ flex: 1, textAlign: "center" }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Revenue</Text>
        <Text strong style={{ fontSize: 13, color: "#10b981" }}>
          Ksh {fmtK(record.daily_revenue || 0)}
        </Text>
      </div>
      <div style={{ width: 1, background: "#e2e8f0" }} />
      <div style={{ flex: 1, textAlign: "center" }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Staff</Text>
        <Space size={4}>
          <TeamOutlined style={{ fontSize: 11, color: "#06b6d4" }} />
          <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
            {record.staff_count ?? 0}
          </Text>
        </Space>
      </div>
    </div>

    {/* Action row */}
    <div style={{ display: "flex", gap: 8 }}>
      <Button
        type="primary"
        icon={<ArrowRightOutlined />}
        size="middle"
        onClick={() => onOpen(record._id)}
        style={{
          flex: 1,
          background: "#0f172a",
          borderColor: "#0f172a",
          borderRadius: 8,
          fontWeight: 500,
          fontSize: 13,
        }}
      >
        Open Shop
      </Button>
      <AddEditShopModal edit={true} actionRef={tableRef} data={record} />
      <Popconfirm
        title="Delete this shop?"
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

// ── Mobile list view ──────────────────────────────────────────────────────────

interface MobileListProps {
  isAccountingOnly: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
}

const MobileShopList: React.FC<MobileListProps> = ({ isAccountingOnly, tableRef }) => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadShops = async () => {
    setLoading(true);
    try {
      const data = await fetchAllShops({});
      setShops(data);
    } catch {
      message.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShops(); }, []);

  const DeleteMutation = useMutation(deleteShop, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => {
      message.success("Shop deleted");
      setDeletingId(null);
      loadShops();
    },
    onError: () => {
      message.error("Failed to delete shop");
      setDeletingId(null);
    },
  });

  const handleOpen = (shopId: string) => {
    localStorage.setItem("shopId", shopId);
    navigate(isAccountingOnly ? "/accounting" : "/tables");
  };

  const filtered = shops.filter((s) =>
    !searchText || s.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.location?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {/* Mobile toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search branches…"
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
          onClick={loadShops}
          loading={loading}
          style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }}
        />
        <AddEditShopModal edit={false} actionRef={tableRef} />
      </div>

      {/* Summary strip */}
      {!loading && shops.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            padding: "10px 12px",
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}
        >
          {[
            { icon: <ShopOutlined />, label: "Branches", value: shops.length, color: "#f97316", bg: "#fff7ed" },
            {
              icon: <DollarOutlined />,
              label: "Revenue",
              value: `Ksh ${fmtK(shops.reduce((s, r) => s + (r.daily_revenue || 0), 0))}`,
              color: "#10b981",
              bg: "#f0fdf4",
            },
            {
              icon: <TeamOutlined />,
              label: "Staff",
              value: shops.reduce((s, r) => s + (r.staff_count || 0), 0),
              color: "#06b6d4",
              bg: "#ecfeff",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: item.bg,
                borderRadius: 8,
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ color: item.color, fontSize: 13, marginBottom: 1 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : filtered.length === 0 ? (
        <Empty description="No branches found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <ShopCard
            key={record._id}
            record={record}
            isAccountingOnly={isAccountingOnly}
            onOpen={handleOpen}
            onDelete={(id) => DeleteMutation.mutate(id)}
            deleting={deletingId === record._id}
            tableRef={tableRef}
          />
        ))
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const ShopManagementTable = () => {
  const tableRef = useRef<ActionType>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAccountingOnly } = useTenantConfig();

  const DeleteShopMutation = useMutation(deleteShop, {
    onSuccess: () => {
      tableRef.current?.reload();
      message.success("Shop deleted successfully");
    },
    onError: () => message.error("Failed to delete shop"),
  });

  const handleShopClick = (shopId: string) => {
    localStorage.setItem("shopId", shopId);
    navigate(isAccountingOnly ? "/accounting" : "/tables");
  };

  // ── Desktop columns ────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        title: "Branch Name",
        dataIndex: "name",
        key: "name",
        copyable: true,
        ellipsis: true,
        tip: "Branch name is unique across the system",
        formItemProps: {
          rules: [{ required: true, message: "Branch name is required" }],
        },
        render: (_: any, record: any) => (
          <Space size={8} align="center">
            <div
              style={{
                background: "#fff7ed",
                borderRadius: 7,
                padding: "4px 6px",
                color: "#f97316",
                fontSize: 13,
                lineHeight: 1,
              }}
            >
              <ShopOutlined />
            </div>
            <div>
              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                {record.name}
              </Text>
              {record.location && (
                <Space size={3} style={{ marginTop: 1 }}>
                  <EnvironmentOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>{record.location}</Text>
                </Space>
              )}
            </div>
          </Space>
        ),
      },
      {
        title: "Location",
        dataIndex: "location",
        hideInSearch: false,
        render: (val: string) =>
          val ? (
            <Space size={4}>
              <EnvironmentOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
              <Text style={{ fontSize: 13, color: "#374151" }}>{val}</Text>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          ),
      },
      ...(!isAccountingOnly
        ? [
          {
            title: "Mode",
            dataIndex: "pos_mode",
            hideInSearch: false,
            width: 120,
            valueEnum: {
              restaurant: { text: "Restaurant" },
              retail: { text: "Retail" },
            },
            render: (_: any, record: any) =>
              record.pos_mode ? <PosModeTag mode={record.pos_mode} /> : <Text type="secondary">—</Text>,
          },
        ]
        : []),
      {
        title: "Daily Revenue",
        dataIndex: "daily_revenue",
        hideInSearch: true,
        width: 140,
        render: (_: any, record: any) => (
          <Text strong style={{ color: "#10b981", fontSize: 13 }}>
            Ksh {fmtK(record?.daily_revenue || 0)}
          </Text>
        ),
      },
      {
        title: "Staff",
        dataIndex: "staff_count",
        hideInSearch: true,
        width: 90,
        sorter: (a: any, b: any) => a.staff_count - b.staff_count,
        render: (_: any, record: any) => (
          <Space size={4}>
            <TeamOutlined style={{ color: "#06b6d4", fontSize: 12 }} />
            <Text style={{ fontSize: 13, color: "#374151" }}>{record?.staff_count ?? 0}</Text>
          </Space>
        ),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        hideInSearch: true,
        width: 180,
        render: (_: any, record: any) => (
          <Space size={6}>
            <Tooltip title="Open shop">
              <Button
                type="primary"
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={() => handleShopClick(record._id)}
                style={{
                  background: "#0f172a",
                  borderColor: "#0f172a",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  height: 28,
                  paddingInline: 10,
                }}
              >
                Open
              </Button>
            </Tooltip>
            <AddEditShopModal edit={true} actionRef={tableRef} data={record} />
            <Popconfirm
              title="Delete this shop?"
              description="This action cannot be undone."
              onConfirm={() => DeleteShopMutation.mutate(record._id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Tooltip title="Delete shop">
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ borderRadius: 6, height: 28, width: 28, padding: 0 }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [isAccountingOnly]
  );

  // ── Mobile: render card list instead of table ────────────────────────────────
  if (isMobile) {
    return <MobileShopList isAccountingOnly={isAccountingOnly} tableRef={tableRef} />;
  }

  // ── Desktop: ProTable ────────────────────────────────────────────────────────
  return (
    <ProTable
      rowKey="_id"
      cardBordered
      style={{ borderRadius: 12 }}
      headerTitle={
        <Space size={8} align="center">
          <BranchesOutlined style={{ color: "#f97316", fontSize: 16 }} />
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>All Branches</Text>
        </Space>
      }
      columns={columns}
      request={async (params) => {
        const data = await fetchAllShops(params);
        return { data, success: true, total: data.length };
      }}
      pagination={{
        pageSize: 10,
        showQuickJumper: true,
        showSizeChanger: true,
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {range[0]}–{range[1]} of {total} branches
          </Text>
        ),
      }}
      actionRef={tableRef}
      options={{
        fullScreen: true,
        setting: true,
        density: true,
        reload: true,
      }}
      rowSelection={{ alwaysShowAlert: false, selections: false }}
      tableAlertRender={({ selectedRowKeys }) => (
        <Text style={{ fontSize: 13 }}>
          {selectedRowKeys.length} branch{selectedRowKeys.length !== 1 ? "es" : ""} selected
        </Text>
      )}
      search={{
        searchText: "Search",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      dateFormatter="string"
      toolBarRender={() => [
        <AddEditShopModal key="add" edit={false} actionRef={tableRef} />,
      ]}
      summary={(pageData) => {
        const totalRevenue = pageData.reduce((s: number, r: any) => s + (r.daily_revenue || 0), 0);
        const totalStaff = pageData.reduce((s: number, r: any) => s + (r.staff_count || 0), 0);
        if (!pageData.length) return null;
        return (
          <tr>
            <td
              colSpan={columns.length}
              style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}
            >
              <Row gutter={[8, 8]}>
                {[
                  { icon: <ShopOutlined />, label: "Branches on page", value: pageData.length, color: "#f97316", bg: "#fff7ed" },
                  { icon: <DollarOutlined />, label: "Page Revenue", value: `Ksh ${fmtK(totalRevenue)}`, color: "#10b981", bg: "#f0fdf4" },
                  { icon: <TeamOutlined />, label: "Total Staff", value: totalStaff, color: "#06b6d4", bg: "#ecfeff" },
                ].map((item, i) => (
                  <Col xs={12} sm={8} key={i}>
                    <div style={{ background: item.bg, borderRadius: 8, padding: "8px 12px" }}>
                      <Space size={6} align="center">
                        <div style={{ background: `${item.color}20`, borderRadius: 6, padding: "4px 5px", color: item.color, fontSize: 13, lineHeight: 1 }}>
                          {item.icon}
                        </div>
                        <div>
                          <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>{item.label}</Text>
                          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>{item.value}</Text>
                        </div>
                      </Space>
                    </div>
                  </Col>
                ))}
              </Row>
            </td>
          </tr>
        );
      }}
    />
  );
};

export default ShopManagementTable;