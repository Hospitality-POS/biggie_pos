import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getOrdersByLocation } from "@services/orders";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  greenLight: "#f0fdf4",
  blue: "#3b82f6",
  blueLight: "#eff6ff",
  orange: "#f59e0b",
  orangeLight: "#fffbeb",
  purple: "#8b5cf6",
  purpleLight: "#faf5ff",
  red: "#ef4444",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationData {
  country: string;
  county: string;
  city: string;
  orders: any[];
  total_amount: number;
  order_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 0 });
const fmtAmt = (n: number) => `KES ${fmt(n)}`;

// ── Tiny KPI card ─────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: string; icon: React.ReactNode;
  color: string; bg: string; border: string;
}> = ({ label, value, icon, color, bg, border }) => (
  <div style={{
    flex: "1 1 140px",
    background: bg,
    border: `1px solid ${border}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 10,
    padding: "12px 16px",
    minWidth: 130,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <span style={{ color, fontSize: 13 }}>{icon}</span>
      <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
        {label}
      </Text>
    </div>
    <Text strong style={{ fontSize: 18, color }}>{value}</Text>
  </div>
);

// ── Inline mini-bar (used in table) ───────────────────────────────────────────
const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
      <div style={{
        width: `${Math.max(2, (value / (max || 1)) * 100)}%`,
        height: "100%",
        background: color,
        borderRadius: 3,
        transition: "width 0.3s",
      }} />
    </div>
    <Text style={{ fontSize: 12, color: C.subText, minWidth: 90, textAlign: "right" }}>
      {fmtAmt(value)}
    </Text>
  </div>
);

// ── Report print template ─────────────────────────────────────────────────────
const ReportDocument = React.forwardRef<HTMLDivElement, {
  data: LocationData[];
  filters: { from?: string; to?: string };
  primaryColor: string;
  businessName: string;
  businessAddress: string;
  logoUrl: string | null;
  tenantInitial: string;
}>(({ data, filters, primaryColor, businessName, businessAddress, logoUrl, tenantInitial }, ref) => {
  const totalOrders   = data.reduce((s, l) => s + l.order_count, 0);
  const totalRevenue  = data.reduce((s, l) => s + l.total_amount, 0);
  const avgPerOrder   = totalOrders ? totalRevenue / totalOrders : 0;

  return (
    <div
      ref={ref}
      id="order-analysis-report"
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#0f172a",
        background: "#fff",
        padding: "32px 36px",
        minWidth: 700,
      }}
    >
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body * { visibility: hidden; }
          #order-analysis-report, #order-analysis-report * { visibility: visible; }
          #order-analysis-report { position: absolute; inset: 0; padding: 0; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `3px solid ${primaryColor}`, paddingBottom: 18, marginBottom: 20,
      }}>
        {/* Logo / initials */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {logoUrl ? (
            <img
              src={logoUrl} alt="logo"
              style={{ height: 60, maxWidth: 120, objectFit: "contain", borderRadius: 6 }}
            />
          ) : (
            <div style={{
              width: 54, height: 54, borderRadius: 10,
              background: primaryColor, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 22, fontWeight: 700,
            }}>
              {tenantInitial}
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{businessName}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{businessAddress}</div>
          </div>
        </div>

        {/* Report label */}
        <div style={{ textAlign: "right" }}>
          <div style={{
            display: "inline-block",
            background: primaryColor, color: "#fff",
            borderRadius: 6, padding: "4px 12px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.8px",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            Order Analysis
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {filters.from && filters.to
              ? `${dayjs(filters.from).format("D MMM YYYY")} – ${dayjs(filters.to).format("D MMM YYYY")}`
              : "All Time"}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Generated {dayjs().format("D MMM YYYY, h:mm A")}
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "Locations", value: String(data.length),      color: C.blue,   bg: C.blueLight   },
          { label: "Total Orders",  value: fmt(totalOrders),     color: C.purple, bg: C.purpleLight  },
          { label: "Revenue",       value: fmtAmt(totalRevenue), color: C.green,  bg: C.greenLight   },
          { label: "Avg / Order",   value: fmtAmt(avgPerOrder),  color: C.orange, bg: C.orangeLight  },
        ].map((k) => (
          <div key={k.label} style={{
            flex: "1 1 130px", padding: "12px 14px",
            background: k.bg, borderRadius: 8,
            border: `1px solid ${k.color}30`, borderLeft: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Revenue bar chart ── */}
      {data.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Revenue by Location
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.map((l) => ({ name: l.city || l.county, revenue: l.total_amount }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <RTooltip formatter={(v: any) => [`KES ${fmt(Number(v))}`, "Revenue"]} />
              <Bar dataKey="revenue" fill={primaryColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Location summary table ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 10,
          textTransform: "uppercase", letterSpacing: "0.5px",
          paddingBottom: 6, borderBottom: `2px solid ${C.border}`,
        }}>
          Location Breakdown
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: primaryColor + "12" }}>
              {["City", "County", "Country", "Orders", "Revenue", "Avg / Order"].map((h) => (
                <th key={h} style={{
                  padding: "7px 10px", textAlign: h === "Revenue" || h === "Avg / Order" || h === "Orders" ? "right" : "left",
                  fontWeight: 700, color: "#0f172a", fontSize: 11,
                  borderBottom: `2px solid ${primaryColor}30`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((loc, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                <td style={{ padding: "7px 10px", fontWeight: 600 }}>{loc.city || "—"}</td>
                <td style={{ padding: "7px 10px" }}>{loc.county || "—"}</td>
                <td style={{ padding: "7px 10px" }}>{loc.country || "—"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>{loc.order_count}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: C.green, fontWeight: 700 }}>
                  {fmtAmt(loc.total_amount)}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: C.orange }}>
                  {fmtAmt(loc.order_count ? loc.total_amount / loc.order_count : 0)}
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr style={{ background: primaryColor + "12", fontWeight: 800, borderTop: `2px solid ${primaryColor}30` }}>
              <td colSpan={3} style={{ padding: "8px 10px", fontWeight: 800 }}>TOTAL</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800 }}>{totalOrders}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", color: C.green, fontWeight: 800 }}>{fmtAmt(totalRevenue)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", color: C.orange, fontWeight: 800 }}>{fmtAmt(avgPerOrder)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Orders grouped by location ── */}
      <div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 12,
          textTransform: "uppercase", letterSpacing: "0.5px",
          paddingBottom: 6, borderBottom: `2px solid ${C.border}`,
        }}>
          Orders by Location
        </div>

        {data.map((loc, locIdx) => (
          <div key={locIdx} style={{ marginBottom: 20, breakInside: "avoid" as any }}>
            {/* Location group header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: primaryColor + "12",
              border: `1px solid ${primaryColor}25`,
              borderRadius: "6px 6px 0 0",
              padding: "8px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: primaryColor }}>📍</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.darkText }}>
                  {loc.city || "—"}
                </span>
                <span style={{ fontSize: 11, color: C.subText }}>
                  {[loc.county, loc.country].filter(Boolean).join(", ")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                <span>
                  <span style={{ color: C.subText }}>Orders: </span>
                  <strong style={{ color: C.blue }}>{loc.order_count}</strong>
                </span>
                <span>
                  <span style={{ color: C.subText }}>Revenue: </span>
                  <strong style={{ color: C.green }}>{fmtAmt(loc.total_amount)}</strong>
                </span>
                <span>
                  <span style={{ color: C.subText }}>Avg: </span>
                  <strong style={{ color: C.orange }}>{fmtAmt(loc.order_count ? loc.total_amount / loc.order_count : 0)}</strong>
                </span>
              </div>
            </div>

            {/* Orders table for this location */}
            <table style={{
              width: "100%", borderCollapse: "collapse", fontSize: 11,
              border: `1px solid ${primaryColor}20`, borderTop: "none",
              borderRadius: "0 0 6px 6px", overflow: "hidden",
            }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Order No", "Customer", "Phone", "Amount", "Type", "Status", "Date", "Served By"].map((h) => (
                    <th key={h} style={{
                      padding: "5px 8px",
                      textAlign: h === "Amount" ? "right" : "left",
                      fontWeight: 700, color: C.subText, fontSize: 10,
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loc.orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "10px 12px", textAlign: "center", color: C.subText, fontSize: 11, fontStyle: "italic" }}>
                      No orders
                    </td>
                  </tr>
                ) : (
                  loc.orders.map((order: any, i: number) => (
                    <tr key={`${order.order_no}-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "5px 8px", fontWeight: 700, fontFamily: "monospace", color: primaryColor, fontSize: 11 }}>
                        {order.order_no}
                      </td>
                      <td style={{ padding: "5px 8px" }}>{order.customer_name || "—"}</td>
                      <td style={{ padding: "5px 8px", color: C.subText }}>{order.customer_phone || "—"}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: C.green }}>
                        KES {fmt(order.order_amount || 0)}
                      </td>
                      <td style={{ padding: "5px 8px" }}>{order.order_type || "—"}</td>
                      <td style={{ padding: "5px 8px" }}>
                        <span style={{
                          background: order.status === "COMPLETED" ? "#dcfce7" : "#fef9c3",
                          color: order.status === "COMPLETED" ? "#166534" : "#92400e",
                          padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: "5px 8px", color: C.subText, whiteSpace: "nowrap" }}>
                        {dayjs(order.createdAt).format("DD MMM YYYY HH:mm")}
                      </td>
                      <td style={{ padding: "5px 8px" }}>{order.served_by || "—"}</td>
                    </tr>
                  ))
                )}
                {/* Location subtotal row */}
                {loc.orders.length > 1 && (
                  <tr style={{ background: primaryColor + "08", borderTop: `1px solid ${primaryColor}20` }}>
                    <td colSpan={3} style={{ padding: "5px 8px", fontWeight: 700, fontSize: 11 }}>
                      Subtotal ({loc.order_count} orders)
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: C.green }}>
                      KES {fmt(loc.total_amount)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{
        marginTop: 28, paddingTop: 12,
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: "#94a3b8",
      }}>
        <span>{businessName} — Confidential</span>
        <span>Generated by BiggiePOS · {dayjs().format("D MMM YYYY")}</span>
      </div>
    </div>
  );
});
ReportDocument.displayName = "ReportDocument";

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const OrdersByLocation = () => {
  const primaryColor = usePrimaryColor();

  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<LocationData[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [tenant, setTenant]   = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    country: undefined as string | undefined,
    county:  undefined as string | undefined,
    city:    undefined as string | undefined,
    from:    dayjs().startOf("month").format("YYYY-MM-DD") as string | undefined,
    to:      dayjs().format("YYYY-MM-DD")                  as string | undefined,
  });

  // System settings (for business name / address)
  const { data: systemSettings } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    staleTime: 5 * 60_000,
  });

  const businessName = String(systemSettings?.name || tenant?.business_name || "Business");
  const businessAddress =
    typeof systemSettings?.address === "object"
      ? [systemSettings.address.street, systemSettings.address.city, systemSettings.address.country]
          .filter(Boolean).join(", ")
      : String(systemSettings?.address || tenant?.address || "");
  const logoUrl      = tenant?.tenant_logo?.url || null;
  const tenantInitial = businessName.charAt(0).toUpperCase();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getOrdersByLocation(filters);
      setData(result?.grouped_by_location || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const storedTenant = localStorage.getItem("tenant");
    if (storedTenant) {
      try { setTenant(JSON.parse(storedTenant)); } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalOrders  = data.reduce((s, l) => s + l.order_count, 0);
  const totalRevenue = data.reduce((s, l) => s + l.total_amount, 0);
  const avgPerOrder  = totalOrders ? totalRevenue / totalOrders : 0;
  const maxRevenue   = Math.max(...data.map((l) => l.total_amount), 1);

  const countryOptions = useMemo(() => [...new Set(data.map((d) => d.country))].map((v) => ({ value: v, label: v })), [data]);
  const countyOptions  = useMemo(() => [...new Set(data.map((d) => d.county))].map((v) => ({ value: v, label: v })), [data]);
  const cityOptions    = useMemo(() => [...new Set(data.map((d) => d.city))].map((v) => ({ value: v, label: v })), [data]);

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary
    const summaryRows = [
      ["City", "County", "Country", "Order Count", "Total Revenue (KES)", "Avg per Order (KES)"],
      ...data.map((l) => [
        l.city, l.county, l.country, l.order_count, l.total_amount,
        l.order_count ? +(l.total_amount / l.order_count).toFixed(2) : 0,
      ]),
      ["TOTAL", "", "", totalOrders, totalRevenue, +avgPerOrder.toFixed(2)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    // Sheet 2 — All orders
    const orderRows = [
      ["Order No", "Customer Name", "Customer Phone", "City", "County", "Country", "Amount (KES)", "Type", "Status", "Date", "Served By"],
      ...data.flatMap((loc) =>
        loc.orders.map((o: any) => [
          o.order_no, o.customer_name, o.customer_phone,
          loc.city, loc.county, loc.country,
          o.order_amount, o.order_type, o.status,
          dayjs(o.createdAt).format("DD MMM YYYY HH:mm"),
          o.served_by || "",
        ])
      ),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(orderRows), "Orders");

    const dateStr = `${filters.from || "all"}_to_${filters.to || "all"}`;
    XLSX.writeFile(wb, `Order_Analysis_${dateStr}.xlsx`);
  };

  // ── Print/PDF ─────────────────────────────────────────────────────────────
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Order_Analysis_${filters.from}_${filters.to}`,
  });

  // ── Main table columns ─────────────────────────────────────────────────────
  const locationColumns = [
    {
      title: "Location",
      key: "location",
      render: (_: any, r: LocationData) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: primaryColor + "18", borderRadius: 7, padding: "4px 6px",
            color: primaryColor, fontSize: 13, flexShrink: 0,
          }}>
            <EnvironmentOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 13, color: C.darkText }}>{r.city || "—"}</Text>
            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
              {[r.county, r.country].filter(Boolean).join(", ")}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Orders",
      dataIndex: "order_count",
      key: "order_count",
      width: 90,
      align: "center" as const,
      render: (v: number) => (
        <Tag color="blue" style={{ fontWeight: 700, fontSize: 12, borderRadius: 6 }}>{v}</Tag>
      ),
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 300,
      render: (_: any, r: LocationData) => (
        <MiniBar value={r.total_amount} max={maxRevenue} color={primaryColor} />
      ),
    },
    {
      title: "Avg / Order",
      key: "avg",
      width: 130,
      align: "right" as const,
      render: (_: any, r: LocationData) => (
        <Text style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>
          {fmtAmt(r.order_count ? r.total_amount / r.order_count : 0)}
        </Text>
      ),
    },
  ];

  const orderColumns = [
    {
      title: "Order No",
      dataIndex: "order_no",
      key: "order_no",
      width: 130,
      render: (v: string) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</Text>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, r: any) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.customer_name || "—"}</Text>
          <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{r.customer_phone}</Text>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "order_amount",
      key: "order_amount",
      width: 130,
      align: "right" as const,
      render: (v: number) => (
        <Text strong style={{ color: C.green, fontSize: 12 }}>{fmtAmt(v || 0)}</Text>
      ),
    },
    {
      title: "Type",
      dataIndex: "order_type",
      key: "order_type",
      width: 110,
      render: (v: string) => <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => (
        <Tag color={v === "COMPLETED" ? "green" : "orange"} style={{ fontSize: 11 }}>{v}</Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v: string) => (
        <Text style={{ fontSize: 11, color: C.subText }}>{dayjs(v).format("DD MMM YYYY HH:mm")}</Text>
      ),
    },
    {
      title: "Served By",
      key: "served_by",
      width: 120,
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 12 }}>{r.served_by || "—"}</Text>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 16px",
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 6 }}>
          <div style={{
            background: primaryColor + "18", borderRadius: 7,
            padding: "5px 7px", color: primaryColor, fontSize: 14, lineHeight: 1,
          }}>
            <BarChartOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.2 }}>
              Order Analysis
            </Text>
            <Text style={{ fontSize: 11, color: C.subText }}>by location</Text>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />

        {/* Filters */}
        <RangePicker
          size="small"
          value={
            filters.from && filters.to
              ? [dayjs(filters.from), dayjs(filters.to)]
              : null
          }
          onChange={(dates) => {
            if (dates?.[0] && dates?.[1]) {
              setFilters((f) => ({
                ...f,
                from: dates[0]!.format("YYYY-MM-DD"),
                to:   dates[1]!.format("YYYY-MM-DD"),
              }));
            } else {
              setFilters((f) => ({ ...f, from: undefined, to: undefined }));
            }
          }}
          style={{ width: 230 }}
          allowClear
          suffixIcon={<CalendarOutlined style={{ color: C.subText }} />}
        />

        <Select
          size="small"
          placeholder="Country"
          allowClear
          value={filters.country}
          onChange={(v) => setFilters((f) => ({ ...f, country: v }))}
          options={countryOptions}
          style={{ width: 130 }}
        />
        <Select
          size="small"
          placeholder="County"
          allowClear
          value={filters.county}
          onChange={(v) => setFilters((f) => ({ ...f, county: v }))}
          options={countyOptions}
          style={{ width: 130 }}
        />
        <Select
          size="small"
          placeholder="City"
          allowClear
          value={filters.city}
          onChange={(v) => setFilters((f) => ({ ...f, city: v }))}
          options={cityOptions}
          style={{ width: 120 }}
        />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <Button
          size="small"
          icon={<FilterOutlined />}
          type="primary"
          onClick={fetchData}
          loading={loading}
          style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 7 }}
        >
          Apply
        </Button>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => {
            setFilters({
              country: undefined, county: undefined, city: undefined,
              from: dayjs().startOf("month").format("YYYY-MM-DD"),
              to:   dayjs().format("YYYY-MM-DD"),
            });
            fetchData();
          }}
          style={{ borderRadius: 7 }}
        >
          Reset
        </Button>
        <Button
          size="small"
          icon={<BarChartOutlined />}
          onClick={() => setReportOpen(true)}
          style={{ borderRadius: 7, fontWeight: 600 }}
        >
          View Report
        </Button>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      {data.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <KpiCard label="Locations"    value={String(data.length)}  icon={<EnvironmentOutlined />} color={C.blue}   bg={C.blueLight}   border={C.blue + "30"} />
          <KpiCard label="Total Orders" value={fmt(totalOrders)}     icon={<ShoppingCartOutlined />} color={C.purple} bg={C.purpleLight}  border={C.purple + "30"} />
          <KpiCard label="Revenue"      value={fmtAmt(totalRevenue)} icon={<DollarOutlined />}      color={C.green}  bg={C.greenLight}   border={C.green + "30"} />
          <KpiCard label="Avg / Order"  value={fmtAmt(avgPerOrder)}  icon={<DollarOutlined />}      color={C.orange} bg={C.orangeLight}  border={C.orange + "30"} />
        </div>
      )}

      {/* ── Main data table ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
        </div>
      ) : data.length === 0 ? (
        <Empty description="No orders found for the selected filters" style={{ padding: "60px 0" }} />
      ) : (
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: "hidden",
        }}>
          <Table
            rowKey={(r) => `${r.country}-${r.county}-${r.city}`}
            columns={locationColumns}
            dataSource={data}
            pagination={false}
            size="middle"
            expandable={{
              expandedRowRender: (loc: LocationData) => (
                <div style={{ padding: "8px 0 8px 40px", background: C.bg }}>
                  <Table
                    rowKey={(r: any, i) => `${r.order_no}-${i}`}
                    columns={orderColumns}
                    dataSource={loc.orders}
                    pagination={{ pageSize: 10, size: "small" }}
                    size="small"
                    scroll={{ x: 800 }}
                    style={{ background: "#fff", borderRadius: 8 }}
                  />
                </div>
              ),
              rowExpandable: (loc: LocationData) => loc.orders.length > 0,
              columnWidth: 40,
            }}
            summary={() => (
              <Table.Summary.Row style={{ background: primaryColor + "0d", fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>
                  <Text strong style={{ fontSize: 12 }}>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <Tag color="blue" style={{ fontWeight: 700 }}>{totalOrders}</Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong style={{ color: C.green }}>{fmtAmt(totalRevenue)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ color: C.orange }}>{fmtAmt(avgPerOrder)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      )}

      {/* ── Report Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={reportOpen}
        onCancel={() => setReportOpen(false)}
        width="min(1000px, 96vw)"
        title={
          <Space size={8}>
            <div style={{
              background: primaryColor + "18", borderRadius: 7,
              padding: "4px 6px", color: primaryColor, fontSize: 14, lineHeight: 1,
            }}>
              <BarChartOutlined />
            </div>
            <div>
              <Text strong style={{ fontSize: 13 }}>Order Analysis Report</Text>
              <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                {filters.from && filters.to
                  ? `${dayjs(filters.from).format("D MMM YYYY")} – ${dayjs(filters.to).format("D MMM YYYY")}`
                  : "All Time"}
              </Text>
            </div>
          </Space>
        }
        styles={{
          body: { padding: 0, maxHeight: "76vh", overflowY: "auto", background: C.bg },
        }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setReportOpen(false)}>Close</Button>
            <Tooltip title="Download Excel workbook with Summary + Orders sheets">
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExcelExport}
                style={{ color: "#166534", borderColor: "#bbf7d0", background: "#f0fdf4", fontWeight: 600 }}
              >
                Download Excel
              </Button>
            </Tooltip>
            <Tooltip title="Print or save as PDF">
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={handlePrint as any}
                style={{ background: primaryColor, borderColor: primaryColor, fontWeight: 600 }}
              >
                Download PDF
              </Button>
            </Tooltip>
          </div>
        }
        destroyOnClose={false}
      >
        <div style={{ padding: "16px 20px", background: C.bg }}>
          {/* Preview wrapper */}
          <div style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}>
            <ReportDocument
              ref={printRef}
              data={data}
              filters={filters}
              primaryColor={primaryColor}
              businessName={businessName}
              businessAddress={businessAddress}
              logoUrl={logoUrl}
              tenantInitial={tenantInitial}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersByLocation;
