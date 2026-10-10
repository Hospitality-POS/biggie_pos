import {
  CheckCircleOutlined,
  ClearOutlined,
  DollarOutlined,
  LockOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useCurrency } from "@components/Currency";
import {
  bulkClearTables,
  bulkPayTables,
  bulkVoidTables,
} from "@services/cart";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { getAllTables } from "@services/tables";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Empty,
  message,
} from "antd";
import React, { useMemo, useState } from "react";
import { useAppSelector } from "src/store";

const { Text } = Typography;

// Filter value for tables with no served_by marker
const UNASSIGNED = "__unassigned__";

type StatusFilter = "all" | "occupied" | "available" | "locked";
type BulkAction = "pay" | "void" | "clear";

interface TableStatsProps {
  isMobile: boolean;
  primaryColor: string;
}

const isOccupiedTable = (t: any) => !!t?.isOccupied || t?.status === "occupied";

const TableStatsPanel: React.FC<TableStatsProps> = ({ isMobile, primaryColor }) => {
  const { formatAmount } = useCurrency();
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [servedByFilter, setServedByFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [withBalanceOnly, setWithBalanceOnly] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkRunning, setBulkRunning] = useState<BulkAction | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<string>();

  const canManageTables = user?.role === "admin" || user?.role === "cashier";

  // GET /tables returns every table across all locations in one shot —
  // the unique-locatedAt endpoint only fills tables for a single location.
  // getAllTables applies the same waiter privacy filtering as the tabs view.
  const currentUserKey = (user as any)?._id || user?.id || "anon";
  const { data = [], isLoading } = useQuery({
    queryKey: ["tables", "stats", currentUserKey],
    queryFn: () => getAllTables({}),
    networkMode: "always",
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  // Flatten to a row per table, carrying its location name (the endpoint
  // returns locatedAt as the location name string; tolerate grouped shapes too)
  const rows = useMemo(() => {
    const out: any[] = [];
    (data || []).forEach((item: any) => {
      if (item?.isDisabled) return;
      if (Array.isArray(item?.tables)) {
        item.tables.forEach((t: any) => {
          if (t?.isDisabled) return;
          out.push({ ...t, locationName: item.name || "—" });
        });
      } else {
        const loc = item?.locatedAt;
        out.push({
          ...item,
          locationName:
            typeof loc === "string" ? loc : loc?.name || "—",
        });
      }
    });
    return out;
  }, [data]);

  const servedByOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => {
      if (r?.served_by && String(r.served_by).trim() !== "") {
        names.add(String(r.served_by));
      }
    });
    return [
      { value: UNASSIGNED, label: "Unassigned" },
      ...[...names].sort().map((n) => ({ value: n, label: n })),
    ];
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const occupied = isOccupiedTable(r);
        if (statusFilter === "occupied" && !occupied) return false;
        if (statusFilter === "available" && (occupied || r.isLocked)) return false;
        if (statusFilter === "locked" && !r.isLocked) return false;
        if (servedByFilter === UNASSIGNED && r.served_by) return false;
        if (
          servedByFilter &&
          servedByFilter !== UNASSIGNED &&
          String(r.served_by) !== servedByFilter
        )
          return false;
        if (withBalanceOnly && !(Number(r.cart_amount) > 0)) return false;
        return true;
      }),
    [rows, statusFilter, servedByFilter, withBalanceOnly]
  );

  const totals = useMemo(() => {
    const occupied = filtered.filter(isOccupiedTable);
    const locked = filtered.filter((r) => r.isLocked);
    const amount = filtered.reduce((s, r) => s + (r.cart_amount || 0), 0);
    const occupiedAmount = occupied.reduce((s, r) => s + (r.cart_amount || 0), 0);
    return {
      count: filtered.length,
      occupied: occupied.length,
      available: filtered.length - occupied.length - locked.length,
      locked: locked.length,
      amount,
      occupiedAmount,
      servers: new Set(
        filtered.filter((r) => r.served_by).map((r) => String(r.served_by))
      ).size,
    };
  }, [filtered]);

  // ── Bulk actions on open tables ───────────────────────────────────────────
  // Targets = occupied tables (or tables holding an open cart value) in the
  // current filtered view; narrowing by checkbox selection when rows are picked.
  const openRows = useMemo(
    () => filtered.filter((r) => isOccupiedTable(r) || (r.cart_amount ?? 0) > 0),
    [filtered]
  );
  const targets = useMemo(
    () =>
      selectedRowKeys.length
        ? openRows.filter((r) => selectedRowKeys.includes(r._id))
        : openRows,
    [openRows, selectedRowKeys]
  );

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
    enabled: payModalOpen,
  });

  const finishBulk = (ok: number, fail: number, skipped: number, verb: string) => {
    if (ok) message.success(`${verb} ${ok} table${ok === 1 ? "" : "s"}`);
    if (skipped) message.info(`${skipped} table${skipped === 1 ? "" : "s"} skipped`);
    if (fail) message.warning(`${fail} table${fail === 1 ? "" : "s"} failed`);
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    setSelectedRowKeys([]);
  };

  // One request per action — the API resolves each table's open cart, runs it
  // through the normal order/void/clear pipeline, and returns per-table results.
  const reportBulk = (results: any[] | undefined, verb: string) => {
    const ok = (results || []).filter((r) =>
      ["paid", "voided", "cleared"].includes(r.status)
    ).length;
    const skipped = (results || []).filter((r) => r.status === "skipped").length;
    const fail = (results || []).filter((r) => r.status === "failed").length;
    finishBulk(ok, fail, skipped, verb);
  };

  const runBulkPay = async () => {
    if (!payMethod) {
      message.error("Select a payment method first");
      return;
    }
    setBulkRunning("pay");
    try {
      const res = await bulkPayTables(
        targets.map((t) => t._id),
        payMethod,
        user?.id || user?._id
      );
      setPayModalOpen(false);
      setPayMethod(undefined);
      reportBulk(res?.results, "Payment confirmed for");
    } catch {
      message.error("Bulk payment failed");
    } finally {
      setBulkRunning(null);
    }
  };

  const runBulkVoid = async () => {
    setBulkRunning("void");
    try {
      const res = await bulkVoidTables(targets.map((t) => t._id));
      reportBulk(res?.results, "Voided");
    } catch {
      message.error("Bulk void failed");
    } finally {
      setBulkRunning(null);
    }
  };

  const runBulkClear = async () => {
    setBulkRunning("clear");
    try {
      const res = await bulkClearTables(targets.map((t) => t._id));
      reportBulk(res?.results, "Cleared");
    } catch {
      message.error("Bulk clear failed");
    } finally {
      setBulkRunning(null);
    }
  };

  const statCards = [
    { title: "Tables", value: totals.count, color: "#0f172a" },
    { title: "Occupied", value: totals.occupied, color: primaryColor },
    { title: "Available", value: totals.available, color: "#16a34a" },
    { title: "Locked", value: totals.locked, color: "#dc2626" },
    { title: "Servers", value: totals.servers, color: "#7c3aed" },
  ];

  const allColumns = [
    {
      title: "Table",
      dataIndex: "name",
      key: "name",
      render: (v: any) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Location",
      dataIndex: "locationName",
      key: "locationName",
      render: (v: any) => <Text type="secondary">{v}</Text>,
    },
    {
      title: "Status",
      key: "status",
      filters: [
        { text: "Occupied", value: "occupied" },
        { text: "Available", value: "available" },
        { text: "Locked", value: "locked" },
      ],
      onFilter: (value: any, record: any) => {
        const occupied = isOccupiedTable(record);
        if (value === "occupied") return occupied;
        if (value === "locked") return !!record.isLocked;
        return !occupied && !record.isLocked;
      },
      render: (_: any, r: any) =>
        r.isLocked ? (
          <Tag icon={<LockOutlined />} color="error">Locked</Tag>
        ) : isOccupiedTable(r) ? (
          <Tag icon={<StopOutlined />} color="processing">Occupied</Tag>
        ) : (
          <Tag icon={<CheckCircleOutlined />} color="success">Available</Tag>
        ),
    },
    {
      title: "Served By",
      dataIndex: "served_by",
      key: "served_by",
      render: (v: any) =>
        v ? (
          <Space size={4}>
            <TeamOutlined style={{ color: "#94a3b8" }} />
            <Text>{v}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Open Amount",
      dataIndex: "cart_amount",
      key: "cart_amount",
      align: "right" as const,
      sorter: (a: any, b: any) => (a.cart_amount || 0) - (b.cart_amount || 0),
      render: (v: number) => (
        <Text strong={v > 0} type={v > 0 ? undefined : "secondary"}>
          {formatAmount(v || 0)}
        </Text>
      ),
    },
  ];

  // Location column is desktop-only; summary cells must stay positional
  const columns = isMobile
    ? allColumns.filter((c) => c.key !== "locationName")
    : allColumns;

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeContent: "center", minHeight: 240 }}>
        <Spin size="large" />
      </div>
    );
  }

  const summaryCells = [
    // Spacer for the leading checkbox column when row selection is enabled
    ...(canManageTables ? [<span key="sel-spacer" />] : []),
    <Text strong key="label">
      Totals ({totals.count})
    </Text>,
    ...(isMobile ? [] : [<span key="loc-spacer" />]),
    <Text type="secondary" style={{ fontSize: 12 }} key="status-total">
      {totals.occupied} occupied · {totals.available} available
    </Text>,
    <Text type="secondary" style={{ fontSize: 12 }} key="servers-total">
      {totals.servers} server{totals.servers === 1 ? "" : "s"}
    </Text>,
    <Text strong style={{ color: primaryColor }} key="amount-total">
      {formatAmount(totals.amount)}
    </Text>,
  ];

  return (
    <div
      style={{
        padding: isMobile ? "8px 0" : "16px 0",
        height: isMobile ? "auto" : "calc(100vh - 280px)",
        overflowY: isMobile ? "visible" : "auto",
      }}
    >
      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(3, 1fr)"
            : "repeat(auto-fit, minmax(130px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.title}
            style={{
              background: "#fff",
              border: "1px solid #f1f5f9",
              borderRadius: 10,
              padding: isMobile ? "10px 12px" : "14px 16px",
            }}
          >
            <Statistic
              title={<Text style={{ fontSize: 12, color: "#64748b" }}>{s.title}</Text>}
              value={s.value}
              valueStyle={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: s.color }}
            />
          </div>
        ))}
        <div
          style={{
            background: `${primaryColor}10`,
            border: `1px solid ${primaryColor}30`,
            borderRadius: 10,
            padding: isMobile ? "10px 12px" : "14px 16px",
            gridColumn: isMobile ? "span 2" : undefined,
          }}
        >
          <Statistic
            title={<Text style={{ fontSize: 12, color: "#64748b" }}>Open Total</Text>}
            value={totals.amount}
            formatter={(v) => formatAmount(Number(v))}
            valueStyle={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: primaryColor }}
          />
        </div>
      </div>

      {/* ── Filters ── */}
      <Space
        wrap
        size={isMobile ? 8 : 12}
        style={{ marginBottom: 12, width: "100%", justifyContent: "space-between", display: "flex" }}
      >
        <Select
          allowClear
          showSearch
          placeholder="Served by"
          value={servedByFilter}
          onChange={(v) => setServedByFilter(v)}
          options={servedByOptions}
          style={{ minWidth: isMobile ? 140 : 200 }}
          optionFilterProp="label"
        />
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { label: "All", value: "all" },
            { label: "Occupied", value: "occupied" },
            { label: "Available", value: "available" },
            { label: "Locked", value: "locked" },
          ]}
          size={isMobile ? "small" : "middle"}
        />
        <Checkbox
          checked={withBalanceOnly}
          onChange={(e) => setWithBalanceOnly(e.target.checked)}
          style={{ marginInlineStart: 0 }}
        >
          <Text style={{ fontSize: isMobile ? 12 : 14 }}>With balance only</Text>
        </Checkbox>
      </Space>

      {/* ── Bulk actions on open tables (admin/cashier) ── */}
      {canManageTables && openRows.length > 0 && (
        <Space
          wrap
          size={8}
          align="center"
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            background: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: 8,
            width: "100%",
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {targets.length} open table{targets.length === 1 ? "" : "s"}
            {selectedRowKeys.length ? " selected" : " (all shown)"}
          </Text>
          <Button
            size="small"
            type="primary"
            icon={<DollarOutlined />}
            disabled={!targets.length || !!bulkRunning}
            onClick={() => setPayModalOpen(true)}
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Pay All
          </Button>
          <Popconfirm
            title={`Void ${targets.length} open cart${targets.length === 1 ? "" : "s"}?`}
            description="Each cart is recorded as voided, its items removed, and the table freed."
            okText="Void All"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={runBulkVoid}
            disabled={!targets.length || !!bulkRunning}
          >
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              loading={bulkRunning === "void"}
              disabled={!targets.length || !!bulkRunning}
              style={{ borderRadius: 6 }}
            >
              Void All
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`Clear ${targets.length} open cart${targets.length === 1 ? "" : "s"}?`}
            description="Removes every item from these carts and frees the tables."
            okText="Clear All"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={runBulkClear}
            disabled={!targets.length || !!bulkRunning}
          >
            <Button
              size="small"
              danger
              icon={<ClearOutlined />}
              loading={bulkRunning === "clear"}
              disabled={!targets.length || !!bulkRunning}
              style={{ borderRadius: 6 }}
            >
              Clear All
            </Button>
          </Popconfirm>
        </Space>
      )}

      {/* ── Table ── */}
      <Table
        rowKey={(r: any) => r._id}
        dataSource={filtered}
        columns={columns}
        size="small"
        rowSelection={
          canManageTables
            ? {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (r: any) => ({
                  disabled: !isOccupiedTable(r) && !(r.cart_amount > 0),
                }),
              }
            : undefined
        }
        pagination={isMobile ? { pageSize: 20, size: "small" } : false}
        scroll={isMobile ? undefined : { y: "calc(100vh - 520px)" }}
        locale={{ emptyText: <Empty description="No tables match the filters" /> }}
        style={{ background: "#fff", borderRadius: 10 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: "#f8fafc" }}>
              {summaryCells.map((cell, i) => (
                <Table.Summary.Cell
                  key={i}
                  index={i}
                  align={i === summaryCells.length - 1 ? "right" : undefined}
                >
                  {cell}
                </Table.Summary.Cell>
              ))}
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* ── Bulk payment confirmation ── */}
      <Modal
        title="Confirm payment for open tables"
        open={payModalOpen}
        onCancel={() => {
          setPayModalOpen(false);
          setPayMethod(undefined);
        }}
        onOk={runBulkPay}
        okText={`Pay ${targets.length} table${targets.length === 1 ? "" : "s"}`}
        okButtonProps={{
          disabled: !payMethod,
          style: { backgroundColor: primaryColor, borderColor: primaryColor },
        }}
        confirmLoading={bulkRunning === "pay"}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>
            This creates a paid order for{" "}
            <Text strong>{targets.length}</Text> open table
            {targets.length === 1 ? "" : "s"} totalling{" "}
            <Text strong style={{ color: primaryColor }}>
              {formatAmount(targets.reduce((s, t) => s + (t.cart_amount || 0), 0))}
            </Text>
            . Each table's cart is closed and freed.
          </Text>
          <Select
            placeholder="Payment method"
            value={payMethod}
            onChange={setPayMethod}
            options={paymentMethods.map((m: any) => ({ value: m._id, label: m.name }))}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default TableStatsPanel;
