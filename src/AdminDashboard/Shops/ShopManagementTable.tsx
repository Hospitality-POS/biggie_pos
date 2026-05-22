// ShopManagementTable.tsx
import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { ActionType, ProTable, ProCard } from "@ant-design/pro-components";
import {
  Tooltip, Button, Space, Popconfirm, message, Tag,
  Typography, Card, Skeleton, Empty, Tabs,
} from "antd";
import {
  DeleteOutlined, ShopOutlined, ArrowRightOutlined,
  BranchesOutlined, DollarOutlined, TeamOutlined,
  EnvironmentOutlined, ReloadOutlined, MedicineBoxOutlined,
  GlobalOutlined, LinkOutlined, SolutionOutlined, PrinterOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import {
  deleteShop, fetchAllShops,
  GOOGLE_MAPS_API_KEY,
} from "@services/shops";
import AddEditShopModal from "@components/MODALS/pro/AddEditShopModal";
import { useNavigate } from "react-router-dom";
import PrintSettingsTab from "../../pages/Settings/systemSetup/PrintSettingsTab";

const { Text } = Typography;

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
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
};

/**
 * Central tenant config hook.
 *
 * Navigation targets when the user clicks "Open Shop":
 *   - POS (default)        → /tables
 *   - Accounting only      → /accounting
 *   - Mteja only           → /mteja
 *
 * Tabs / columns hidden per module:
 *   - Print Settings tab   → shown ONLY when POS is active (hidden for accounting-only & mteja-only)
 *   - POS Mode column/tag  → shown ONLY when POS is active (hidden for accounting-only & mteja-only)
 *   - Revenue column/stat  → hidden for mteja-only tenants
 */
const useTenantConfig = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting);
  const hasMteja = tenant?.modules?.crm === true;
  const hasDala = tenant?.modules?.dala === true;
  const isAccountingOnly = hasAccounting && !hasPOS && !hasDala;
  const isMtejaOnly = hasMteja && !hasPOS && !hasAccounting && !hasDala;
  const isDalaOnly = hasDala && !hasPOS && !hasAccounting && !hasMteja;

  /** Where "Open Shop" should navigate */
  const shopLandingPath = isMtejaOnly
    ? "/mteja"
    : isAccountingOnly
      ? "/accounting"
      : isDalaOnly
        ? "/dala"
        : hasPOS
          ? "/tables"
          : "/home-dashboard";

  /** Whether the Print Settings tab should be visible */
  const showPrintSettings = hasPOS && !isMtejaOnly;

  /** Whether POS Mode column / tag should be visible */
  const showPosMode = hasPOS && !isMtejaOnly;

  /** Whether revenue column / stat should be visible (hidden for mteja-only) */
  const showRevenue = !isMtejaOnly;

  return { isAccountingOnly, isMtejaOnly, shopLandingPath, showPrintSettings, showPosMode, showRevenue };
};

const getLocationDisplay = (loc: any): string => {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  return loc.formatted_address || loc.address || "";
};

const hasCoords = (loc: any): boolean =>
  loc && typeof loc === "object" && loc.lat != null && loc.lng != null;

// ── POS mode config ───────────────────────────────────────────────────────────
const POS_MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  restaurant: { label: "Duka Services", icon: <SolutionOutlined />, color: "#c2410c", bg: "#fff7ed" },
  retail: { label: "Retail", icon: <ShopOutlined />, color: "#1d4ed8", bg: "#eff6ff" },
  hospital: { label: "Hospital", icon: <MedicineBoxOutlined />, color: "#059669", bg: "#f0fdf4" },
};

// ── POS Mode Tag ──────────────────────────────────────────────────────────────
const PosModeTag: React.FC<{ mode: string }> = ({ mode }) => {
  const cfg = POS_MODE_CONFIG[mode] ?? POS_MODE_CONFIG.restaurant;
  return (
    <Tag
      icon={cfg.icon}
      style={{
        background: cfg.bg, color: cfg.color,
        border: "none", borderRadius: 6,
        padding: "2px 8px", fontSize: 11, fontWeight: 500,
      }}
    >
      {cfg.label}
    </Tag>
  );
};

// ── InfoWindow HTML for map markers ──────────────────────────────────────────
const buildInfoHtml = (shop: any): string => {
  const cfg = POS_MODE_CONFIG[shop.pos_mode] ?? POS_MODE_CONFIG.restaurant;
  const modeHtml = shop.pos_mode
    ? `<div style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;background:${cfg.bg};color:${cfg.color};margin-bottom:6px">${cfg.label}</div>`
    : "";
  const address = getLocationDisplay(shop.location);
  return `
    <div style="padding:8px 4px;min-width:190px;font-family:system-ui,sans-serif">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:3px">${shop.name}</div>
      <div style="font-size:11px;color:#64748b;line-height:1.4;margin-bottom:4px">${address}</div>
      ${shop.location?.city ? `<div style="font-size:10px;color:#94a3b8;margin-bottom:4px">${[shop.location.city, shop.location.country].filter(Boolean).join(", ")}</div>` : ""}
      ${modeHtml}
      ${address ? `<button onclick="navigator.clipboard.writeText('${address.replace(/'/g, "\\'")}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Address',1500)" style="font-size:11px;color:#3b82f6;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">Copy Address</button>` : ""}
    </div>
  `;
};

// ── Map View ──────────────────────────────────────────────────────────────────
const MapView: React.FC<{ shops: any[]; height?: number }> = ({ shops, height = 480 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWinRef = useRef<any>(null);
  const shopsRef = useRef<any[]>([]);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const located = shops.filter(s => s.location && getLocationDisplay(s.location));
  const withCoords = located.filter(s => hasCoords(s.location));
  shopsRef.current = withCoords;

  const shopKey = withCoords.map(s => s._id).join(",");

  // Load Google Maps SDK
  useEffect(() => {
    const loadGoogleMaps = () => {
      if ((window as any).google?.maps) {
        setSdkLoaded(true);
        return;
      }
      if (document.getElementById("gmap-script")) {
        const check = setInterval(() => {
          if ((window as any).google?.maps) {
            clearInterval(check);
            setSdkLoaded(true);
          }
        }, 100);
        return;
      }
      const key = GOOGLE_MAPS_API_KEY;
      if (!key) {
        setSdkLoaded(false);
        return;
      }
      const script = document.createElement("script");
      script.id = "gmap-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setSdkLoaded(true);
      script.onerror = () => setSdkLoaded(false);
      document.head.appendChild(script);
    };
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    const g = (window as any).google?.maps;
    if (!g || !mapRef.current || withCoords.length === 0 || !sdkLoaded) return;

    if (!mapObjRef.current) {
      mapObjRef.current = new g.Map(mapRef.current, {
        zoom: 12,
        center: { lat: withCoords[0].location.lat, lng: withCoords[0].location.lng },
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
    }

    if (!infoWinRef.current) infoWinRef.current = new g.InfoWindow();

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    withCoords.forEach((shop, idx) => {
      const cfg = POS_MODE_CONFIG[shop.pos_mode] ?? POS_MODE_CONFIG.restaurant;
      const marker = new g.Marker({
        position: { lat: shop.location.lat, lng: shop.location.lng },
        map: mapObjRef.current,
        title: shop.name,
        label: { 
          text: String(idx + 1), 
          color: "#fff", 
          fontSize: "12px", 
          fontWeight: "700",
          className: "map-marker-label"
        },
        icon: {
          path: g.SymbolPath.CIRCLE,
          scale: 18, 
          fillColor: cfg.color, 
          fillOpacity: 1,
          strokeColor: "#fff", 
          strokeWeight: 3,
        },
        animation: g.Animation.DROP,
      });

      marker.addListener("click", () => {
        openInfo(g, shop, marker);
      });

      markersRef.current.push(marker);
    });

    if (withCoords.length > 1) {
      const bounds = new g.LatLngBounds();
      withCoords.forEach(s => bounds.extend({ lat: s.location.lat, lng: s.location.lng }));
      mapObjRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
    } else {
      mapObjRef.current.setCenter({ lat: withCoords[0].location.lat, lng: withCoords[0].location.lng });
      mapObjRef.current.setZoom(15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopKey, sdkLoaded]);

  const openInfo = (g: any, shop: any, marker: any) => {
    if (!infoWinRef.current || !mapObjRef.current) return;
    infoWinRef.current.setContent(buildInfoHtml(shop));
    infoWinRef.current.open(mapObjRef.current, marker);
  };


  if (!located.length) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <EnvironmentOutlined style={{ fontSize: 36, color: "#cbd5e1", marginBottom: 10 }} />
        <Text style={{ display: "block", color: "#64748b", fontSize: 13 }}>
          No location data yet. Edit shops and select locations via Google Maps autocomplete.
        </Text>
      </div>
    );
  }

  const hasGoogleSDK = !!(window as any).google?.maps;
  if (!hasGoogleSDK || withCoords.length === 0) {
    const q = encodeURIComponent(getLocationDisplay(located[0].location));
    const embedUrl = GOOGLE_MAPS_API_KEY
      ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${q}`
      : `https://maps.google.com/maps?q=${q}&output=embed`;
    return (
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <iframe title="shops-map" width="100%" height={height}
          style={{ border: 0, display: "block" }} loading="lazy" allowFullScreen
          referrerPolicy="no-referrer-when-downgrade" src={embedUrl} />
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <div ref={mapRef} style={{ width: "100%", height }} />
    </div>
  );
};


// ── Summary strip ─────────────────────────────────────────────────────────────
const SummaryStrip: React.FC<{ shops: any[]; isMtejaOnly?: boolean }> = ({ shops, isMtejaOnly }) => {
  if (!shops.length) return null;
  const stats = [
    { icon: <ShopOutlined />, label: "Branches", value: shops.length, color: "#f97316", bg: "#fff7ed" },
    // Revenue hidden for mteja-only tenants
    ...(!isMtejaOnly ? [{
      icon: <DollarOutlined />,
      label: "Today Revenue",
      value: `Ksh ${fmtK(shops.reduce((s, r) => s + (r.daily_revenue || 0), 0))}`,
      color: "#10b981",
      bg: "#f0fdf4",
    }] : []),
    { icon: <TeamOutlined />, label: "Total Staff", value: shops.reduce((s, r) => s + (r.staff_count || 0), 0), color: "#06b6d4", bg: "#ecfeff" },
    { icon: <EnvironmentOutlined />, label: "Mapped", value: shops.filter(s => hasCoords(s.location)).length, color: "#8b5cf6", bg: "#f5f3ff" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10, marginBottom: 16 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: s.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${s.color}20` }}>
          <div style={{ color: s.color, fontSize: 14, marginBottom: 3 }}>{s.icon}</div>
          <Text strong style={{ fontSize: 16, color: "#0f172a", display: "block" }}>{s.value}</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</Text>
        </div>
      ))}
    </div>
  );
};

// ── Mobile shop card ──────────────────────────────────────────────────────────
const ShopCard: React.FC<{
  record: any;
  showPosMode: boolean;
  showRevenue: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
}> = ({ record, showPosMode, showRevenue, onOpen, onDelete, deleting, tableRef }) => {
  const locDisplay = getLocationDisplay(record.location);
  return (
    <Card
      style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      bodyStyle={{ padding: "14px 16px" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <Space size={8} align="center">
          <div style={{ background: "#fff7ed", borderRadius: 8, padding: "6px 7px", color: "#f97316", fontSize: 15, lineHeight: 1 }}>
            <ShopOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>{record.name}</Text>
            {locDisplay && (
              <Space size={3} style={{ marginTop: 2 }}>
                <EnvironmentOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>{locDisplay}</Text>
                <Tooltip title="Copy address">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<LinkOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(locDisplay);
                      message.success("Address copied to clipboard");
                    }}
                    style={{ color: "#3b82f6", padding: 0, height: 20 }} 
                  />
                </Tooltip>
              </Space>
            )}
          </div>
        </Space>
        {/* POS Mode tag — hidden for accounting-only and mteja-only */}
        {showPosMode && record.pos_mode && <PosModeTag mode={record.pos_mode} />}
      </div>

      {/* Stats row — revenue hidden for mteja-only */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
        {showRevenue && (
          <>
            <div style={{ flex: 1, textAlign: "center" }}>
              <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Revenue</Text>
              <Text strong style={{ fontSize: 13, color: "#10b981" }}>Ksh {fmtK(record.daily_revenue || 0)}</Text>
            </div>
            <div style={{ width: 1, background: "#e2e8f0" }} />
          </>
        )}
        <div style={{ flex: 1, textAlign: "center" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Staff</Text>
          <Space size={4}>
            <TeamOutlined style={{ fontSize: 11, color: "#06b6d4" }} />
            <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{record.staff_count ?? 0}</Text>
          </Space>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => onOpen(record._id)}
          style={{ flex: 1, background: "#0f172a", borderColor: "#0f172a", borderRadius: 8, fontWeight: 500, fontSize: 13 }}>
          Open Shop
        </Button>
        <AddEditShopModal edit={true} actionRef={tableRef} data={record} />
        <Popconfirm title="Delete this shop?" description="This action cannot be undone."
          onConfirm={() => onDelete(record._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel" placement="topRight">
          <Button danger icon={<DeleteOutlined />} loading={deleting} style={{ borderRadius: 8 }}>Delete</Button>
        </Popconfirm>
      </div>
    </Card>
  );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileShopList: React.FC<{
  shopLandingPath: string;
  showPosMode: boolean;
  showRevenue: boolean;
  isMtejaOnly: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
}> = ({ shopLandingPath, showPosMode, showRevenue, isMtejaOnly, tableRef }) => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("list");

  const loadShops = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchAllShops({}); setShops(data || []); }
    catch { message.error("Failed to load shops"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadShops(); }, []);

  const DeleteMutation = useMutation(deleteShop, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => { message.success("Shop deleted"); setDeletingId(null); loadShops(); },
    onError: () => { message.error("Failed to delete shop"); setDeletingId(null); },
  });

  const handleOpen = (shopId: string) => {
    localStorage.setItem("shopId", shopId);
    navigate(shopLandingPath);
  };

  const filtered = shops.filter(s =>
    !searchText ||
    s.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    getLocationDisplay(s.location)?.toLowerCase().includes(searchText.toLowerCase())
  );

  const tabItems = [
    {
      key: "list",
      label: <Space size={4}><BranchesOutlined />Branches</Space>,
      children: (
        <>
          <div style={{ marginTop: 16 }}>
            <SummaryStrip shops={shops} isMtejaOnly={isMtejaOnly} />
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            ))
            : filtered.length === 0
              ? <Empty description="No branches found" style={{ padding: "40px 0" }} />
              : filtered.map(record => (
                <ShopCard
                  key={record._id}
                  record={record}
                  showPosMode={showPosMode}
                  showRevenue={showRevenue}
                  onOpen={handleOpen}
                  onDelete={id => DeleteMutation.mutate(id)}
                  deleting={deletingId === record._id}
                  tableRef={tableRef}
                />
              ))
          }
        </>
      ),
    },
    {
      key: "map",
      label: (
        <Space size={4}>
          <GlobalOutlined />Map View
          {shops.filter(s => hasCoords(s.location)).length > 0 && (
            <Tag style={{ fontSize: 10, padding: "0 5px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 4 }}>
              {shops.filter(s => hasCoords(s.location)).length}
            </Tag>
          )}
        </Space>
      ),
      children: <MapView shops={shops} height={320} />,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search branches…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "#f8fafc" }}
        />
        <Button icon={<ReloadOutlined />} onClick={loadShops} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        <AddEditShopModal edit={false} actionRef={tableRef} />
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="small"
        style={{ background: "#fff", borderRadius: 12, padding: "0 4px" }} />
    </div>
  );
};

// ── Main desktop component ────────────────────────────────────────────────────
const ShopManagementTable: React.FC = () => {
  const tableRef = useRef<ActionType>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAccountingOnly, isMtejaOnly, shopLandingPath, showPrintSettings, showPosMode, showRevenue } = useTenantConfig();
  const [activeTab, setActiveTab] = useState("table");
  const [allShops, setAllShops] = useState<any[]>([]);

  const DeleteShopMutation = useMutation(deleteShop, {
    onSuccess: () => { tableRef.current?.reload(); message.success("Shop deleted successfully"); },
    onError: () => message.error("Failed to delete shop"),
  });

  const handleShopClick = (shopId: string) => {
    localStorage.setItem("shopId", shopId);
    // Clear localStorage posMode to force refetch from shop settings
    localStorage.removeItem("posMode");
    navigate(shopLandingPath);
  };

  const shopsWithLocation = useMemo(
    () => allShops.filter(s => s.location && getLocationDisplay(s.location)),
    [allShops]
  );

  const columns = useMemo(() => [
    {
      title: "Branch Name",
      dataIndex: "name",
      key: "name",
      width: 250,
      copyable: true,
      ellipsis: true,
      render: (_: any, record: any) => {
        const loc = getLocationDisplay(record.location);
        return (
          <Space size={8} align="center">
            <div style={{ background: "#fff7ed", borderRadius: 7, padding: "4px 6px", color: "#f97316", fontSize: 13, lineHeight: 1 }}>
              <ShopOutlined />
            </div>
            <div>
              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{record.name}</Text>
              {loc && (
                <Space size={3} style={{ display: "flex", marginTop: 1 }}>
                  <EnvironmentOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>{loc}</Text>
                </Space>
              )}
            </div>
          </Space>
        );
      },
    },
    // POS Mode column — hidden for accounting-only and mteja-only tenants
    ...(showPosMode ? [{
      title: "Mode",
      dataIndex: "pos_mode",
      hideInSearch: false,
      width: 120,
      valueEnum: {
        restaurant: { text: "Duka Services" },
        retail: { text: "Retail" },
        hospital: { text: "Hospital" },
      },
      render: (_: any, record: any) =>
        record.pos_mode ? <PosModeTag mode={record.pos_mode} /> : <Text type="secondary">—</Text>,
    }] : []),
    // Today Revenue column — hidden for mteja-only tenants
    ...(showRevenue ? [{
      title: "Today Revenue",
      dataIndex: "daily_revenue",
      hideInSearch: true,
      width: 130,
      sorter: (a: any, b: any) => (a.daily_revenue || 0) - (b.daily_revenue || 0),
      render: (_: any, record: any) => (
        <Text strong style={{ color: "#10b981", fontSize: 13 }}>Ksh {fmtK(record?.daily_revenue || 0)}</Text>
      ),
    }] : []),
    {
      title: "Staff",
      dataIndex: "staff_count",
      hideInSearch: true,
      width: 100,
      sorter: (a: any, b: any) => (a.staff_count || 0) - (b.staff_count || 0),
      render: (_: any, record: any) => (
        <Space size={4}>
          <TeamOutlined style={{ fontSize: 12, color: "#06b6d4" }} />
          <Text style={{ fontSize: 13, color: "#374151" }}>{record?.staff_count ?? 0}</Text>
        </Space>
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      hideInSearch: true,
      width: 200,
      render: (_: any, record: any) => (
        <Space size={6}>
          <Tooltip title="Open shop">
            <Button type="primary" size="small" icon={<ArrowRightOutlined />}
              onClick={() => handleShopClick(record._id)}
              style={{ background: "#0f172a", borderColor: "#0f172a", borderRadius: 6, fontSize: 12, fontWeight: 500, height: 28, paddingInline: 10 }}>
              Open
            </Button>
          </Tooltip>
          <AddEditShopModal edit={true} actionRef={tableRef} data={record} />
          <Popconfirm title="Delete this shop?" description="This action cannot be undone."
            onConfirm={() => DeleteShopMutation.mutate(record._id)}
            okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
            <Tooltip title="Delete shop">
              <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 6, height: 28 }}>Delete</Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ], [showPosMode, showRevenue]);

  if (isMobile) {
    return (
      <MobileShopList
        shopLandingPath={shopLandingPath}
        showPosMode={showPosMode}
        showRevenue={showRevenue}
        isMtejaOnly={isMtejaOnly}
        tableRef={tableRef}
      />
    );
  }

  // Build desktop tab items — Print Settings only shown when POS is active
  const tabItems = [
    {
      key: "table",
      label: <Space size={4}><BranchesOutlined />All Branches</Space>,
      children: (
        <>
          <div style={{ marginTop: 16 }}>
            <SummaryStrip shops={allShops} isMtejaOnly={isMtejaOnly} />
          </div>
          <ProTable
            rowKey="_id"
            cardBordered={false}
            style={{ borderRadius: 0 }}
            columns={columns}
            request={async (params) => {
              const data = await fetchAllShops(params);
              setAllShops(data || []);
              return { data, success: true, total: data?.length ?? 0 };
            }}
            pagination={{
              pageSize: 10,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: (total, range) => (
                <Text style={{ fontSize: 12, color: "#64748b" }}>{range[0]}–{range[1]} of {total} branches</Text>
              ),
            }}
            actionRef={tableRef}
            options={{ fullScreen: true, setting: true, density: true, reload: true }}
            search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
            dateFormatter="string"
            toolBarRender={() => [<AddEditShopModal key="add" edit={false} actionRef={tableRef} />]}
          />
        </>
      ),
    },
    {
      key: "map",
      label: (
        <Space size={4}>
          <GlobalOutlined />
          Map View
          {shopsWithLocation.length > 0 && (
            <Tag style={{ marginLeft: 2, fontSize: 10, padding: "0 5px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 4 }}>
              {shopsWithLocation.length}
            </Tag>
          )}
        </Space>
      ),
      children: (
        <div style={{ padding: 16 }}>
          <MapView shops={shopsWithLocation} height={500} />
        </div>
      ),
    },
    // Print Settings tab — only when POS is active (hidden for accounting-only & mteja-only)
    ...(showPrintSettings ? [{
      key: "print-settings",
      label: (
        <Space size={4}>
          <PrinterOutlined style={{ color: "#6c1c2c" }} />
          Print Settings
        </Space>
      ),
      children: (
        <div style={{ padding: 16 }}>
          <PrintSettingsTab />
        </div>
      ),
    }] : []),
  ];

  return (
    <ProCard
      bordered
      style={{ borderRadius: 12 }}
      headerBordered
      title={
        <Space size={8} align="center">
          <BranchesOutlined style={{ color: "#f97316", fontSize: 16 }} />
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>Branch Management</Text>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ padding: "0 16px" }}
        tabBarStyle={{ marginBottom: 0, borderBottom: "1px solid #f1f5f9" }}
      />
    </ProCard>
  );
};

export default ShopManagementTable;