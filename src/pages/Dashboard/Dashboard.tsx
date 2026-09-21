import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Typography,
  Row,
  Col,
  Space,
  message,
  notification,
  Radio,
  DatePicker,
  Flex,
  Alert,
  Drawer,
  Dropdown,
  Modal,
  Tabs,
  Input,
} from "antd";
import type { MenuProps } from "antd";
import {
  ShoppingCartOutlined,
  TeamOutlined,
  WarningOutlined,
  ReloadOutlined,
  CalendarOutlined,
  DollarOutlined,
  RiseOutlined,
  FilterOutlined,
  ShopOutlined,
  CopyOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  DownloadOutlined,
  QrcodeOutlined,
  ShareAltOutlined,
  DownOutlined,
} from "@ant-design/icons";
import {
  getDashboardAnalysis,
  getBestSellers,
  getSalesChartData,
} from "@services/orders";
import dayjs from "dayjs";
import { QRCodeCanvas } from "qrcode.react";
import { fetchShop } from "@services/shops";
import {
  DashboardKPICards,
  DashboardSalesTrendChart,
  DashboardTopSellersChart,
  DashboardOperationalHub,
} from "src/components/dashboard";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fmtK } from "@utils/formatters";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── POS mode helper ───────────────────────────────────────────────────────────
const getPosMode = (): string => localStorage.getItem("posMode") ?? "service";
const isHospitalMode = (): boolean => getPosMode() === "hospital";
const isHotelMode = (): boolean => getPosMode() === "hotel";

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── URL Share Modal ───────────────────────────────────────────────────────────
interface URLShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  shopLogo?: string;
}

const URLShareModal: React.FC<URLShareModalProps> = ({ open, onClose, url, title, shopLogo }) => {
  const [modalMessage, modalContextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("copy");
  const [qrUrl, setQrUrl] = useState(url);

  React.useEffect(() => {
    setQrUrl(url);
    setActiveTab("copy");
  }, [url, open]);

  const [tenantLogo, setTenantLogo] = React.useState<string | undefined>(shopLogo);
  const [tenantName, setTenantName] = React.useState("");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("tenant");
      const t = stored ? JSON.parse(stored) : null;
      setTenantLogo(t?.tenant_logo?.url || shopLogo);
      setTenantName(t?.name || "");
    } catch {
      setTenantLogo(shopLogo);
      setTenantName("");
    }
  }, [shopLogo, open]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => modalMessage.success({ content: "URL copied to clipboard!", duration: 2 }))
      .catch(() => modalMessage.error({ content: "Failed to copy URL", duration: 2 }));
  };

  const handleDownload = () => {
    const canvas = document.getElementById("url-qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const imageUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      modalMessage.success({ content: "QR Code downloaded!", duration: 2 });
    }
  };

  const tabItems = [
    {
      key: "copy",
      label: (
        <Space size={5}>
          <CopyOutlined />
          Copy URL
        </Space>
      ),
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary" style={{ fontSize: 13 }}>
            Share this link directly with customers or staff.
          </Text>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={url}
              readOnly
              style={{ flex: 1, fontFamily: "monospace", fontSize: 12, background: "#f8fafc" }}
            />
            <Button icon={<CopyOutlined />} type="primary" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        </Space>
      ),
    },
    {
      key: "qr",
      label: (
        <Space size={5}>
          <QrcodeOutlined />
          QR Code
        </Space>
      ),
      children: (
        <Space direction="vertical" align="center" style={{ width: "100%" }} size={16}>
          <div style={{
            padding: 20,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            <QRCodeCanvas
              id="url-qr-canvas"
              value={qrUrl || " "}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={tenantLogo ? {
                src: tenantLogo,
                width: 48,
                height: 48,
                excavate: true,
              } : undefined}
            />
            {tenantName && (
              <Text style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
                {tenantName}
              </Text>
            )}
          </div>

          <Button
            icon={<DownloadOutlined />}
            type="primary"
            onClick={handleDownload}
            disabled={!qrUrl?.trim()}
            style={{ minWidth: 180 }}
          >
            Download QR Code
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space size={8}>
          <div style={{
            background: "#eff6ff", borderRadius: 8, padding: "4px 8px",
            color: "#3b82f6", fontSize: 16, lineHeight: 1, display: "inline-flex",
          }}>
            <QrcodeOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{title}</span>
        </Space>
      }
      footer={null}
      width={480}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      {modalContextHolder}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="middle" />
    </Modal>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const hospital = isHospitalMode();
  const hotel = isHotelMode();
  const primaryColor = usePrimaryColor() || "#10b981";
  const [messageApi, contextHolder] = message.useMessage();

  const [periodFilter, setPeriodFilter] = useState("day");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlModalTitle, setUrlModalTitle] = useState("");
  const [urlModalUrl, setUrlModalUrl] = useState("");

  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop-qr", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  });
  const shopLogo: string | undefined = shopData?.logo;

  const getDateRange = useCallback(() => {
    const today = dayjs();
    let startDate: dayjs.Dayjs, endDate: dayjs.Dayjs;
    switch (periodFilter) {
      case "day":
        startDate = today.startOf("day");
        endDate = today.endOf("day");
        break;
      case "week":
        startDate = today.startOf("week");
        endDate = today.endOf("week");
        break;
      case "month":
        startDate = today.startOf("month");
        endDate = today.endOf("month");
        break;
      case "year":
        startDate = today.startOf("year");
        endDate = today.endOf("year");
        break;
      case "custom":
        if (customDateRange?.length === 2) {
          startDate = customDateRange[0].startOf("day");
          endDate = customDateRange[1].endOf("day");
        } else {
          startDate = today.startOf("day");
          endDate = today.endOf("day");
        }
        break;
      default:
        startDate = today.startOf("day");
        endDate = today.endOf("day");
    }
    return { startDate, endDate };
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();

  // 1. Dashboard summary analysis
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashBoardAnalysis", startDate.format(), endDate.format(), shopId],
    queryFn: () => getDashboardAnalysis(startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
    onError: () => {
      notification.error({ message: "Failed to fetch dashboard data.", duration: 3, placement: "bottomRight" });
    },
  });

  // 2. Sales Chart data
  const chartPeriod = periodFilter === "custom" ? "day" : (periodFilter as "day" | "week" | "month" | "year");

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["salesChartData", periodFilter, startDate.format(), endDate.format(), shopId],
    queryFn: () =>
      getSalesChartData({
        period: chartPeriod,
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
        shop_id: shopId ?? undefined,
      }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
  });

  // 3. Best Sellers data
  const { data: bestSellersData, isLoading: bestSellersLoading } = useQuery({
    queryKey: ["bestSellers", startDate.format(), endDate.format(), shopId],
    queryFn: () =>
      getBestSellers({
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
        shop_id: shopId ?? undefined,
        limit: 10,
      }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
  });

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      messageApi.success({ content: "Dashboard refreshed!", duration: 2 });
    } catch {
      messageApi.error({ content: "Refresh failed.", duration: 3 });
    }
  }, [refetch, messageApi]);

  const handlePeriodChange = useCallback(
    (value: string) => {
      setPeriodFilter(value);
      setShowCustomDatePicker(value === "custom");
      if (isMobile) setFilterDrawerOpen(false);
    },
    [isMobile]
  );

  const handleCopyStaffUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const staffUrl = `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenant?._id}&tenant_code=${tenant?.tenant_code}&shop_id=${shopId}`;
    setUrlModalUrl(staffUrl);
    setUrlModalTitle("Staff Clock-In Link & QR");
    setUrlModalOpen(true);
  }, [shopId]);

  const handleCopyCustomerUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const url = `${import.meta.env.VITE_APP_URL}/admin/customers?tenant_id=${tenant?._id}&shop_id=${shopId}`;
    setUrlModalUrl(url);
    setUrlModalTitle(hospital ? "Patient Portal Link & QR" : hotel ? "Hotel Booking Link & QR" : "Customer Order Link & QR");
    setUrlModalOpen(true);
  }, [shopId, hospital, hotel]);

  const shareMenuItems: MenuProps["items"] = [
    {
      key: "staff",
      icon: <TeamOutlined />,
      label: "Staff Clock-In Link & QR",
      onClick: handleCopyStaffUrl,
    },
    {
      key: "customer",
      icon: hospital ? <MedicineBoxOutlined /> : hotel ? <HomeOutlined /> : <ShoppingCartOutlined />,
      label: hospital ? "Patient Portal Link & QR" : hotel ? "Hotel Booking Link & QR" : "Customer Order Link & QR",
      onClick: handleCopyCustomerUrl,
    },
  ];

  const getFormattedDateRange = useCallback(() => {
    const fmt = "MMM D, YYYY";
    switch (periodFilter) {
      case "day":
        return startDate.format("MMM D, YYYY");
      case "week":
        return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
      case "month":
        return startDate.format("MMMM YYYY");
      case "year":
        return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
        }
        return "Custom Range";
      default:
        return startDate.format("MMM D, YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const isDataLoading = isLoading || isRefetching;
  const growthRate = chartData?.data?.summary?.growth_rate;
  const peakPeriod = chartData?.data?.summary?.peak_period;

  const lowStockCount = Array.isArray(data?.lowStockItems) ? data.lowStockItems.length : 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      {contextHolder}

      {/* ── URL Share Modal ── */}
      <URLShareModal
        open={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        url={urlModalUrl}
        title={urlModalTitle}
        shopLogo={shopLogo}
      />

      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        title="Filter Period"
        placement="bottom"
        height="auto"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{ body: { paddingBottom: 32 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Radio.Group
            value={periodFilter}
            onChange={(e) => handlePeriodChange(e.target.value)}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                <Radio.Button
                  key={val}
                  value={val}
                  style={{ width: "100%", textAlign: "center", borderRadius: 8, marginBottom: 4 }}
                >
                  {label}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
          {showCustomDatePicker && (
            <RangePicker
              value={customDateRange as any}
              onChange={(d) => setCustomDateRange(d || [])}
              allowClear
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Tier 1: Streamlined Control Header ── */}
      <div style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space align="center" size={10}>
            <div
              style={{
                background: hospital ? "#f0fdf4" : hotel ? "#f0fdf4" : `${primaryColor}15`,
                borderRadius: 10,
                padding: "8px 10px",
                color: hospital ? "#10b981" : hotel ? "#10b981" : primaryColor,
                fontSize: 18,
                display: "inline-flex",
              }}
            >
              {hospital ? <MedicineBoxOutlined /> : hotel ? <HomeOutlined /> : <ShopOutlined />}
            </div>
            <div>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                {PERIOD_LABELS[periodFilter]} ·{" "}
                {hospital ? "Hospital Performance" : hotel ? "Hotel Performance" : "POS Branch Overview"}
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {getFormattedDateRange()} · {shopData?.name || "Active Branch"}
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            {isMobile ? (
              <>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerOpen(true)}
                  size="middle"
                >
                  {PERIOD_LABELS[periodFilter]}
                </Button>
                <Dropdown menu={{ items: shareMenuItems }} placement="bottomRight">
                  <Button icon={<ShareAltOutlined />} size="middle" />
                </Dropdown>
                <Button
                  type="primary"
                  icon={<ReloadOutlined spin={isRefetching} />}
                  onClick={handleRefresh}
                  loading={isDataLoading}
                  size="middle"
                />
              </>
            ) : (
              <>
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <CalendarOutlined style={{ color: primaryColor, fontSize: 13 }} />
                  <Radio.Group
                    value={periodFilter}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    buttonStyle="solid"
                    size="small"
                  >
                    <Radio.Button value="day">Day</Radio.Button>
                    <Radio.Button value="week">Week</Radio.Button>
                    <Radio.Button value="month">Month</Radio.Button>
                    <Radio.Button value="year">Year</Radio.Button>
                    <Radio.Button value="custom">Custom</Radio.Button>
                  </Radio.Group>
                </div>

                {showCustomDatePicker && (
                  <RangePicker
                    value={customDateRange as any}
                    onChange={(d) => setCustomDateRange(d || [])}
                    allowClear
                    size="small"
                    style={{ minWidth: 240 }}
                  />
                )}

                <Dropdown menu={{ items: shareMenuItems }}>
                  <Button icon={<ShareAltOutlined />} size="small" style={{ fontWeight: 500 }}>
                    Share Portals <DownOutlined style={{ fontSize: 10 }} />
                  </Button>
                </Dropdown>

                <Button
                  icon={<ReloadOutlined spin={isRefetching} />}
                  onClick={handleRefresh}
                  loading={isDataLoading}
                  size="small"
                  style={{ fontWeight: 500 }}
                >
                  {isRefetching ? "Refreshing..." : "Refresh"}
                </Button>
              </>
            )}
          </Space>
        </Flex>
      </div>

      {/* ── Conditional Urgent Stock Notice ── */}
      {lowStockCount > 0 && (
        <Alert
          message={
            <Space size={8}>
              <Text strong style={{ color: "#b45309", fontSize: 13 }}>
                Inventory Attention Needed:
              </Text>
              <Text style={{ color: "#78350f", fontSize: 12 }}>
                {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"} depleted or running low in stock.
              </Text>
            </Space>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ color: "#d97706" }} />}
          action={
            <Button
              size="small"
              type="link"
              onClick={() => navigate("/inventory")}
              style={{ fontWeight: 600, color: "#b45309", padding: 0 }}
            >
              Manage Inventory →
            </Button>
          }
          style={{
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #fde68a",
            background: "#fffbeb",
          }}
          closable
        />
      )}

      {/* ── Tier 2: Executive KPI Pulse Cards ── */}
      <DashboardKPICards
        revenue={chartData?.data?.summary?.total_sales || data?.todayRevenue || 0}
        totalOrders={chartData?.data?.summary?.total_orders || data?.totalOrderCount || 0}
        growthRate={growthRate}
        activeOrders={data?.activeOrders || 0}
        activeShifts={data?.activeShift || 0}
        loading={isDataLoading}
        hospital={hospital}
        hotel={hotel}
        isAdmin={false}
        onOrdersClick={() => navigate("/orders")}
      />

      {/* ── Tier 3: Visual Analytics & Charts Hub ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {/* Left 60%: Sales & Volume Trend (Area Chart) */}
        <Col xs={24} lg={15}>
          <DashboardSalesTrendChart
            data={chartData?.data?.chart_data || []}
            loading={chartLoading}
            title={`Sales Pulse · ${getFormattedDateRange()}`}
            primaryColor={primaryColor}
            peakPeriod={peakPeriod}
          />
        </Col>

        {/* Right 40%: Top Performers & Mix (Bar & Donut Chart) */}
        <Col xs={24} lg={9}>
          <DashboardTopSellersChart
            bestSellersData={bestSellersData}
            loading={bestSellersLoading}
            dateRange={getFormattedDateRange()}
            isMobile={isMobile}
            hospital={hospital}
            hotel={hotel}
          />
        </Col>
      </Row>

      {/* ── Tier 4: Unified Operations & Fulfillment Hub ── */}
      <Row>
        <Col span={24}>
          <DashboardOperationalHub
            orders={Array.isArray(data?.currentOrders) ? data.currentOrders : []}
            totalOrdersCount={data?.totalOrderCount || 0}
            lowStockItems={Array.isArray(data?.lowStockItems) ? data.lowStockItems : []}
            purchaseOrderStats={data?.purchaseOrderStats}
            loading={isDataLoading}
            isMobile={isMobile}
            hospital={hospital}
            hotel={hotel}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;