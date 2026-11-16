import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  LockOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  StopOutlined,
  TagOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useCurrency } from "@components/Currency";
import {
  bulkClearTables,
  bulkPayTables,
  bulkVoidTables,
} from "@services/cart";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { getAllTables, isServedByOtherStaff } from "@services/tables";
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
  Table,
  Tag,
  Tooltip,
  Typography,
  Empty,
  message,
} from "antd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "src/store";

const { Text } = Typography;

// Filter value for tables with no served_by marker
const UNASSIGNED = "__unassigned__";

// Inventory share colour in the open-value split (service uses the shop colour)
const INVENTORY_COLOR = "#f59e0b";

type StatusFilter = "all" | "occupied" | "available" | "locked";
type ItemTypeFilter = "all" | "service" | "inventory";
type BulkAction = "pay" | "void" | "clear";

interface TableStatsProps {
  isMobile: boolean;
  primaryColor: string;
}

const isOccupiedTable = (t: any) => !!t?.isOccupied || t?.status === "occupied";

// Open cart value for the selected item type — the API splits each cart into
// service_amount (menu/service + miscellaneous lines) and inventory_amount
const amountFor = (t: any, itemType: ItemTypeFilter) =>
  itemType === "service"
    ? Number(t?.service_amount) || 0
    : itemType === "inventory"
      ? Number(t?.inventory_amount) || 0
      : Number(t?.cart_amount) || 0;

// A table's open-cart line for one item (the API groups lines per item)
const itemLineFor = (t: any, itemId: string) =>
  (Array.isArray(t?.items) ? t.items : []).find((i: any) => i.id === itemId);

const TableStatsPanel: React.FC<TableStatsProps> = ({ isMobile, primaryColor }) => {
  const { formatAmount } = useCurrency();
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [servedByFilter, setServedByFilter] = useState<string | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>("all");
  // A single service/inventory item, picked once a type is chosen
  const [itemFilter, setItemFilter] = useState<string | undefined>(undefined);
  const [withBalanceOnly, setWithBalanceOnly] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkRunning, setBulkRunning] = useState<BulkAction | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<string>();

  const canManageTables = user?.role === "admin" || user?.role === "cashier";
  const userRole = (
    typeof user?.role === "string" ? user.role : (user as any)?.roleData?.role_type
  )?.toLowerCase();
  const isWaiter = userRole === "waiter";
  const currentUserId = (user as any)?._id || user?.id || "";
  const currentUserName = (user as any)?.name || (user as any)?.username || "";

  // GET /tables returns every table across all locations in one shot —
  // the unique-locatedAt endpoint only fills tables for a single location.
  // getAllTables applies the same waiter privacy filtering as the tabs view.
  const currentUserKey = (user as any)?._id || user?.id || "anon";
  const { data = [], isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
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

  // Waiters only see their own data in stats — the view is filtered to
  // tables they serve, so other staff, empty and unassigned tables are
  // all excluded. Admin/cashier see everything.
  const visibleRows = useMemo(
    () =>
      isWaiter
        ? rows.filter((r) => {
            const sb = r?.served_by;
            const hasMarker =
              sb !== null &&
              sb !== undefined &&
              sb !== "" &&
              (!Array.isArray(sb) || sb.length > 0);
            return hasMarker && !isServedByOtherStaff(r, currentUserId, currentUserName);
          })
        : rows,
    [rows, isWaiter, currentUserId, currentUserName]
  );

  const locationOptions = useMemo(() => {
    const names = new Set<string>();
    visibleRows.forEach((r) => {
      if (r?.locationName && String(r.locationName).trim() !== "") {
        names.add(String(r.locationName));
      }
    });
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [visibleRows]);

  const servedByOptions = useMemo(() => {
    const names = new Set<string>();
    visibleRows.forEach((r) => {
      if (r?.served_by && String(r.served_by).trim() !== "") {
        names.add(String(r.served_by));
      }
    });
    return [
      { value: UNASSIGNED, label: "Unassigned" },
      ...[...names].sort().map((n) => ({ value: n, label: n })),
    ];
  }, [visibleRows]);

  // Items of the chosen type currently in open carts, with how many tables hold each
  const itemOptions = useMemo(() => {
    if (itemTypeFilter === "all") return [];
    const byId = new Map<string, { name: string; tables: number }>();
    visibleRows.forEach((r) => {
      (Array.isArray(r?.items) ? r.items : []).forEach((i: any) => {
        if (i?.type !== itemTypeFilter) return;
        const entry = byId.get(i.id) || { name: i.name, tables: 0 };
        entry.tables += 1;
        byId.set(i.id, entry);
      });
    });
    return [...byId.entries()]
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, e]) => ({
        value: id,
        label: e.name,
        tables: e.tables,
      }));
  }, [visibleRows, itemTypeFilter]);

  const selectedItemName = itemOptions.find((o) => o.value === itemFilter)?.label;

  // Drop the item filter once that item is no longer in any open cart
  useEffect(() => {
    if (itemFilter && !itemOptions.some((o) => o.value === itemFilter)) {
      setItemFilter(undefined);
    }
  }, [itemFilter, itemOptions]);

  // Value a row contributes under the current item filters
  const rowAmount = useCallback(
    (r: any) =>
      itemFilter
        ? Number(itemLineFor(r, itemFilter)?.amount) || 0
        : amountFor(r, itemTypeFilter),
    [itemFilter, itemTypeFilter]
  );

  const selectItemType = (t: ItemTypeFilter) => {
    setItemTypeFilter(t);
    setItemFilter(undefined);
  };

  const filtered = useMemo(
    () =>
      visibleRows.filter((r) => {
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
        if (locationFilter && r.locationName !== locationFilter) return false;
        // Item type / item narrows to tables currently holding it
        if (itemFilter && !itemLineFor(r, itemFilter)) return false;
        if (itemTypeFilter !== "all" && !(amountFor(r, itemTypeFilter) > 0)) return false;
        if (withBalanceOnly && !(rowAmount(r) > 0)) return false;
        return true;
      }),
    [
      visibleRows,
      statusFilter,
      servedByFilter,
      locationFilter,
      itemTypeFilter,
      itemFilter,
      rowAmount,
      withBalanceOnly,
    ]
  );

  const totals = useMemo(() => {
    const occupied = filtered.filter(isOccupiedTable);
    const locked = filtered.filter((r) => r.isLocked);
    const amount = filtered.reduce((s, r) => s + rowAmount(r), 0);
    const occupiedAmount = occupied.reduce((s, r) => s + rowAmount(r), 0);
    return {
      itemQuantity: itemFilter
        ? filtered.reduce(
            (s, r) => s + (Number(itemLineFor(r, itemFilter)?.quantity) || 0),
            0
          )
        : 0,
      count: filtered.length,
      occupied: occupied.length,
      available: filtered.length - occupied.length - locked.length,
      locked: locked.length,
      amount,
      occupiedAmount,
      serviceAmount: filtered.reduce((s, r) => s + amountFor(r, "service"), 0),
      inventoryAmount: filtered.reduce((s, r) => s + amountFor(r, "inventory"), 0),
      servers: new Set(
        filtered.filter((r) => r.served_by).map((r) => String(r.served_by))
      ).size,
    };
  }, [filtered, itemFilter, rowAmount]);

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

  const occupancyPct = totals.count
    ? Math.round((totals.occupied / totals.count) * 100)
    : 0;

  const statCards = [
    { title: "Tables", value: totals.count, color: "#334155", icon: <AppstoreOutlined /> },
    {
      title: "Occupied",
      value: totals.occupied,
      color: primaryColor,
      icon: <CoffeeOutlined />,
      hint: `${occupancyPct}% occupancy`,
    },
    { title: "Available", value: totals.available, color: "#16a34a", icon: <CheckCircleOutlined /> },
    { title: "Locked", value: totals.locked, color: "#dc2626", icon: <LockOutlined /> },
    { title: "Servers", value: totals.servers, color: "#7c3aed", icon: <TeamOutlined /> },
  ];

  // Service vs inventory split of the open value in the current view
  const splitTotal = totals.serviceAmount + totals.inventoryAmount;
  const servicePct = splitTotal ? (totals.serviceAmount / splitTotal) * 100 : 0;
  const itemTypeLegend = [
    {
      key: "service" as const,
      label: "Service",
      amount: totals.serviceAmount,
      color: primaryColor,
    },
    {
      key: "inventory" as const,
      label: "Inventory",
      amount: totals.inventoryAmount,
      color: INVENTORY_COLOR,
    },
  ];

  const filtersActive =
    !!locationFilter ||
    !!servedByFilter ||
    statusFilter !== "all" ||
    itemTypeFilter !== "all" ||
    !!itemFilter ||
    withBalanceOnly;

  const resetFilters = () => {
    setLocationFilter(undefined);
    setServedByFilter(undefined);
    setStatusFilter("all");
    selectItemType("all");
    setWithBalanceOnly(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

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
      title: selectedItemName
        ? `${selectedItemName} Amount`
        : itemTypeFilter === "service"
          ? "Service Amount"
          : itemTypeFilter === "inventory"
            ? "Inventory Amount"
            : "Open Amount",
      key: "cart_amount",
      align: "right" as const,
      sorter: (a: any, b: any) => rowAmount(a) - rowAmount(b),
      render: (_: any, r: any) => {
        const v = rowAmount(r);
        const service = amountFor(r, "service");
        const inventory = amountFor(r, "inventory");
        const qty = itemFilter ? Number(itemLineFor(r, itemFilter)?.quantity) || 0 : 0;
        return (
          <div style={{ lineHeight: 1.3 }}>
            <Text
              strong={v > 0}
              type={v > 0 ? undefined : "secondary"}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatAmount(v)}
            </Text>
            {itemFilter && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Qty {qty}</div>
            )}
            {/* Mixed carts: show where the value comes from */}
            {itemTypeFilter === "all" && service > 0 && inventory > 0 && (
              <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                <span style={{ color: primaryColor }}>●</span> {formatAmount(service)}
                {"  "}
                <span style={{ color: INVENTORY_COLOR }}>●</span> {formatAmount(inventory)}
              </div>
            )}
          </div>
        );
      },
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
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: isMobile ? 10 : 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: isMobile ? 15 : 17, color: "#0f172a" }}>
            Table Stats
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dataUpdatedAt
                ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Live view of your tables"}
            </Text>
          </div>
        </div>
        <Tooltip title="Refresh">
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ borderRadius: 8 }}
          >
            {isMobile ? null : "Refresh"}
          </Button>
        </Tooltip>
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(3, 1fr)"
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 16,
        }}
      >
        {/* Open value — the headline number, with its service/inventory split */}
        <div
          style={{
            ...cardStyle,
            background: `linear-gradient(135deg, ${primaryColor}14, ${primaryColor}05)`,
            border: `1px solid ${primaryColor}33`,
            padding: isMobile ? "12px 14px" : "16px 18px",
            gridColumn: isMobile ? "1 / -1" : "span 2",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              {selectedItemName
                ? `Open Total · ${selectedItemName}`
                : itemTypeFilter === "service"
                  ? "Open Service Total"
                  : itemTypeFilter === "inventory"
                    ? "Open Inventory Total"
                    : "Open Total"}
            </Text>
            <div
              style={{
                fontSize: isMobile ? 22 : 26,
                fontWeight: 700,
                color: primaryColor,
                lineHeight: 1.2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatAmount(totals.amount)}
            </div>
            {itemFilter && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Qty {totals.itemQuantity} across {totals.count} table
                {totals.count === 1 ? "" : "s"}
              </Text>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: "#e2e8f0",
              }}
            >
              {splitTotal > 0 && (
                <>
                  <div style={{ width: `${servicePct}%`, background: primaryColor }} />
                  <div style={{ flex: 1, background: INVENTORY_COLOR }} />
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {itemTypeLegend.map((l) => {
                const active = itemTypeFilter === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => selectItemType(active ? "all" : l.key)}
                    title={active ? "Show all items" : `Show ${l.label.toLowerCase()} only`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 10px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#334155",
                      background: active ? "#fff" : "transparent",
                      border: `1px solid ${active ? l.color : "#e2e8f0"}`,
                      boxShadow: active ? `0 0 0 2px ${l.color}22` : "none",
                      transition: "all .15s",
                    }}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: 2, background: l.color }}
                    />
                    {l.label}
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {formatAmount(l.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {statCards.map((s) => (
          <div
            key={s.title}
            style={{ ...cardStyle, padding: isMobile ? "10px 12px" : "14px 16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: isMobile ? 22 : 26,
                  height: isMobile ? 22 : 26,
                  borderRadius: 7,
                  background: `${s.color}14`,
                  color: s.color,
                  fontSize: isMobile ? 12 : 13,
                }}
              >
                {s.icon}
              </span>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{s.title}</Text>
            </div>
            <div
              style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
            {s.hint && !isMobile && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {s.hint}
              </Text>
            )}
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          ...cardStyle,
          padding: isMobile ? 10 : "12px 14px",
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: isMobile ? 8 : 10,
        }}
      >
        <Select
          allowClear
          showSearch
          prefix={<EnvironmentOutlined style={{ color: "#94a3b8" }} />}
          placeholder="All locations"
          value={locationFilter}
          onChange={(v) => setLocationFilter(v)}
          options={locationOptions}
          style={{ minWidth: isMobile ? 150 : 190, flex: isMobile ? 1 : undefined }}
          optionFilterProp="label"
        />
        {/* Served-by filter is only meaningful for admin/cashier — waiters
            are already scoped to their own tables */}
        {!isWaiter && (
          <Select
            allowClear
            showSearch
            prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
            placeholder="All staff"
            value={servedByFilter}
            onChange={(v) => setServedByFilter(v)}
            options={servedByOptions}
            style={{ minWidth: isMobile ? 150 : 200, flex: isMobile ? 1 : undefined }}
            optionFilterProp="label"
          />
        )}
        <Select
          allowClear
          prefix={<ShoppingOutlined style={{ color: "#94a3b8" }} />}
          placeholder="All items"
          value={itemTypeFilter === "all" ? undefined : itemTypeFilter}
          onChange={(v) => selectItemType((v as ItemTypeFilter) || "all")}
          options={[
            { value: "service", label: "Service" },
            { value: "inventory", label: "Inventory" },
          ]}
          style={{ minWidth: isMobile ? 150 : 170, flex: isMobile ? 1 : undefined }}
        />
        {/* Second step: pick one service / inventory item in open carts */}
        {itemTypeFilter !== "all" && (
          <Select
            allowClear
            showSearch
            prefix={<TagOutlined style={{ color: "#94a3b8" }} />}
            placeholder={
              itemTypeFilter === "service" ? "All services" : "All inventory items"
            }
            value={itemFilter}
            onChange={(v) => setItemFilter(v)}
            options={itemOptions}
            optionFilterProp="label"
            optionRender={(o) => (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{o.label}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {o.data.tables} table{o.data.tables === 1 ? "" : "s"}
                </Text>
              </div>
            )}
            notFoundContent={
              <Text type="secondary" style={{ fontSize: 12 }}>
                No {itemTypeFilter === "service" ? "services" : "inventory items"} in
                open tables
              </Text>
            }
            popupMatchSelectWidth={false}
            style={{ minWidth: isMobile ? 150 : 220, flex: isMobile ? 1 : undefined }}
          />
        )}
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
          <Text style={{ fontSize: isMobile ? 12 : 13 }}>With balance only</Text>
        </Checkbox>
        <div style={{ flex: 1 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {filtered.length} of {visibleRows.length} tables
        </Text>
        {filtersActive && (
          <Button
            type="link"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={resetFilters}
            style={{ paddingInline: 0 }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* ── Bulk actions on open tables (admin/cashier) ── */}
      {canManageTables && openRows.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: "8px 12px",
            background: `${primaryColor}0a`,
            border: `1px solid ${primaryColor}26`,
            borderLeft: `3px solid ${primaryColor}`,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#334155", marginRight: "auto" }}>
            <Text strong>{targets.length}</Text> open table
            {targets.length === 1 ? "" : "s"}
            {selectedRowKeys.length ? " selected" : " in view"}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {" · "}
              {formatAmount(targets.reduce((s, t) => s + (t.cart_amount || 0), 0))}
            </Text>
          </Text>
          {selectedRowKeys.length > 0 && (
            <Button
              size="small"
              type="text"
              onClick={() => setSelectedRowKeys([])}
              style={{ borderRadius: 6 }}
            >
              Clear selection
            </Button>
          )}
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
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
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
          scroll={isMobile ? undefined : { y: "max(320px, calc(100vh - 640px))" }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  filtersActive ? (
                    <span>
                      No tables match the filters ·{" "}
                      <a onClick={resetFilters}>Reset filters</a>
                    </span>
                  ) : (
                    "No tables yet"
                  )
                }
              />
            ),
          }}
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
      </div>

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
