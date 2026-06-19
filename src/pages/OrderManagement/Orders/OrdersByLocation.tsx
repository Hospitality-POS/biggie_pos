import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Typography, Select, DatePicker, Button, Space, Empty, Spin, Tag, Table, Modal } from "antd";
import { EnvironmentOutlined, DollarOutlined, ShoppingCartOutlined, FilterOutlined, ReloadOutlined, FilePdfOutlined, DownloadOutlined } from "@ant-design/icons";
import { getOrdersByLocation } from "@services/orders";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CSVLink } from "react-csv";
import { useReactToPrint } from "react-to-print";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

interface LocationData {
  country: string;
  county: string;
  city: string;
  orders: any[];
  total_amount: number;
  order_count: number;
}

const OrdersByLocation = () => {
  const primaryColor = usePrimaryColor();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LocationData[]>([]);
  const [exportData, setExportData] = useState<any[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  // Fetch system settings for business name
  const { data: systemSettings } = useQuery({
    queryKey: ["systemsettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: 3,
    refetchInterval: 3000,
  });
  
  const [filters, setFilters] = useState({
    country: undefined as string | undefined,
    county: undefined as string | undefined,
    city: undefined as string | undefined,
    from: dayjs().format("YYYY-MM-DD") as string | undefined,
    to: dayjs().format("YYYY-MM-DD") as string | undefined,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getOrdersByLocation(filters);
      // Handle the API response structure which has grouped_by_location property
      setData(result?.grouped_by_location || []);
      
      // Prepare export data
      const flatOrders = result?.grouped_by_location?.flatMap((location: LocationData) =>
        location.orders.map((order: any) => ({
          ...order,
          country: location.country,
          county: location.county,
          city: location.city,
        }))
      ) || [];
      setExportData(flatOrders);
    } catch (error) {
      console.error("Error fetching orders by location:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Load tenant data from localStorage
    const storedTenant = localStorage.getItem("tenant");
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        from: dates[0].format("YYYY-MM-DD"),
        to: dates[1].format("YYYY-MM-DD"),
      }));
    } else {
      setFilters((prev) => ({ ...prev, from: undefined, to: undefined }));
    }
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const handleResetFilters = () => {
    setFilters({
      country: undefined,
      county: undefined,
      city: undefined,
      from: undefined,
      to: undefined,
    });
    fetchData();
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const LocationCard: React.FC<{ location: LocationData }> = ({ location }) => {
    const orderColumns = [
      {
        title: "City",
        key: "city",
        render: (_: any, __: any, index: number) => {
          if (index === 0) {
            return <Text strong style={{ fontSize: 13 }}>{String(location.city || "")}</Text>;
          }
          return undefined;
        },
        onCell: (_: any, index?: number) => ({
          rowSpan: index === 0 ? location.orders.length : 0,
        }),
      },
      {
        title: "County",
        key: "county",
        render: (_: any, __: any, index: number) => {
          if (index === 0) {
            return <Text style={{ fontSize: 12 }}>{String(location.county || "")}</Text>;
          }
          return undefined;
        },
        onCell: (_: any, index?: number) => ({
          rowSpan: index === 0 ? location.orders.length : 0,
        }),
      },
      {
        title: "Country",
        key: "country",
        render: (_: any, __: any, index: number) => {
          if (index === 0) {
            return <Text style={{ fontSize: 12 }}>{String(location.country || "")}</Text>;
          }
          return undefined;
        },
        onCell: (_: any, index?: number) => ({
          rowSpan: index === 0 ? location.orders.length : 0,
        }),
      },
      {
        title: "Order No",
        dataIndex: "order_no",
        key: "order_no",
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: "Customer",
        key: "customer",
        render: (_: any, record: any) => (
          <div>
            <div>{record.customer_name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.customer_phone}</Text>
          </div>
        ),
      },
      {
        title: "Amount",
        dataIndex: "order_amount",
        key: "order_amount",
        align: "right" as const,
        render: (amount: number) => <Text>KES {amount?.toLocaleString()}</Text>,
      },
      {
        title: "Type",
        dataIndex: "order_type",
        key: "order_type",
        render: (type: string) => <Tag color="blue">{type}</Tag>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: string) => <Tag color={status === "COMPLETED" ? "green" : "orange"}>{status}</Tag>,
      },
      {
        title: "Date",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (date: string) => <Text style={{ fontSize: 12 }}>{dayjs(date).format("DD MMM YYYY HH:mm")}</Text>,
      },
      {
        title: "Served By",
        key: "served_by",
        render: (_: any, record: any) => (
          <Text style={{ fontSize: 12 }}>{record.served_by || "—"}</Text>
        ),
      },
    ];

    return (
      <Card
        style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${C.border}` }}
        styles={{ body: { padding: "16px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Space>
            <EnvironmentOutlined style={{ color: primaryColor, fontSize: 20 }} />
            <Title level={4} style={{ margin: 0, color: C.darkText }}>{String(location.city || "")}, {String(location.county || "")}</Title>
          </Space>
          <Space>
            <Tag color="blue">{location.order_count} orders</Tag>
            <Tag color="green">KES {location.total_amount.toLocaleString()}</Tag>
          </Space>
        </div>
        <Table
          columns={orderColumns}
          dataSource={location.orders}
          rowKey="order_no"
          pagination={false}
          size="small"
          bordered
          style={{ marginTop: 12 }}
        />
      </Card>
    );
  };

  return (
    <div>
      {/* Filters */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${C.border}` }}
        styles={{ body: { padding: "16px" } }}
      >
        <Space wrap>
          <Space>
            <FilterOutlined style={{ color: primaryColor }} />
            <Text strong>Filters:</Text>
          </Space>
          <Select
            placeholder="Country"
            style={{ width: 150 }}
            allowClear
            value={filters.country}
            onChange={(value) => handleFilterChange("country", value)}
            options={Array.isArray(data) ? [...new Set(data.map((c) => c.country))].map((country) => ({ value: country, label: country })) : []}
          />
          <Select
            placeholder="County"
            style={{ width: 150 }}
            allowClear
            value={filters.county}
            onChange={(value) => handleFilterChange("county", value)}
            options={Array.isArray(data) ? [...new Set(data.map((c) => c.county))].map((county) => ({ value: county, label: county })) : []}
          />
          <Select
            placeholder="City"
            style={{ width: 150 }}
            allowClear
            value={filters.city}
            onChange={(value) => handleFilterChange("city", value)}
            options={Array.isArray(data) ? [...new Set(data.map((c) => c.city))].map((city) => ({ value: city, label: city })) : []}
          />
          <RangePicker
            value={filters.from && filters.to ? [dayjs(filters.from), dayjs(filters.to)] : null}
            onChange={handleDateRangeChange}
            style={{ width: 240 }}
          />
          <Button type="primary" onClick={handleApplyFilters} style={{ background: primaryColor, borderColor: primaryColor }}>
            Apply
          </Button>
          <Button onClick={handleResetFilters}>
            Reset
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={() => setPrintModalOpen(true)}>
            Export PDF
          </Button>
          <CSVLink
            data={exportData}
            filename={`Orders_by_Location_${dayjs().format("YYYY-MM-DD")}.csv`}
          >
            <Button icon={<DownloadOutlined />}>
              Export CSV
            </Button>
          </CSVLink>
        </Space>
      </Card>

      {/* Summary */}
      {data.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, border: `1px solid ${C.border}` }}>
              <Statistic
                title="Total Locations"
                value={data.length}
                valueStyle={{ color: C.blue }}
                prefix={<EnvironmentOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, border: `1px solid ${C.border}` }}>
              <Statistic
                title="Total Orders"
                value={data.reduce((sum, c) => sum + c.order_count, 0)}
                valueStyle={{ color: C.blue }}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, border: `1px solid ${C.border}` }}>
              <Statistic
                title="Total Revenue"
                value={data.reduce((sum, c) => sum + c.total_amount, 0)}
                precision={0}
                valueStyle={{ color: C.green }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, border: `1px solid ${C.border}` }}>
              <Statistic
                title="Avg per Order"
                value={data.reduce((sum, c) => sum + c.total_amount, 0) / data.reduce((sum, c) => sum + c.order_count, 0) || 0}
                precision={0}
                valueStyle={{ color: C.orange }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Data */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : data.length === 0 ? (
        <Empty description="No orders found" style={{ padding: 40 }} />
      ) : (
        data.map((location) => <LocationCard key={`${location.country}-${location.county}-${location.city}`} location={location} />)
      )}

      {/* PDF Export Modal */}
      <Modal
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPrintModalOpen(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<FilePdfOutlined />} onClick={handlePrint} style={{ background: primaryColor, borderColor: primaryColor }}>
            Print / Save as PDF
          </Button>,
        ]}
        width={800}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FilePdfOutlined style={{ color: primaryColor }} />
            <span>Export Orders by Location as PDF</span>
          </div>
        }
        styles={{ body: { padding: "20px", maxHeight: "70vh", overflow: "auto" } }}
      >
        <div ref={printRef} style={{ padding: "24px", background: "#fff" }}>
          {/* Header with Logo */}
          <div style={{ textAlign: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: `3px solid ${primaryColor}` }}>
            {tenant?.tenant_logo?.url ? (
              <img
                src={tenant.tenant_logo.url}
                alt="tenant-logo"
                style={{ maxWidth: "120px", maxHeight: "70px", marginBottom: "12px", objectFit: "contain" }}
              />
            ) : (
              <div style={{ 
                width: "80px", height: "80px", borderRadius: "12px", 
                background: primaryColor, margin: "0 auto 12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "24px", fontWeight: "bold"
              }}>
                {tenant?.business_name?.charAt(0) || "B"}
              </div>
            )}
            <Title level={3} style={{ margin: "8px 0 4px", color: C.darkText, fontSize: "20px" }}>
              {String(systemSettings?.name || tenant?.business_name || "Business Name")}
            </Title>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {typeof systemSettings?.address === "object" && systemSettings?.address?.country 
                ? String(systemSettings.address.country) 
                : typeof systemSettings?.address === "object" 
                  ? JSON.stringify(systemSettings.address)
                  : String(systemSettings?.address || typeof tenant?.address === "object" && tenant?.address?.country
                    ? String(tenant.address.country)
                    : typeof tenant?.address === "object"
                      ? JSON.stringify(tenant.address)
                      : String(tenant?.address || "Business Address"))}
            </Text>
          </div>

          {/* Report Title */}
          <div style={{ textAlign: "center", marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
            <Title level={4} style={{ margin: "0 0 8px", color: primaryColor, fontSize: "18px" }}>
              Orders by Location Report
            </Title>
            <Text type="secondary" style={{ fontSize: "13px" }}>
              {filters.from && filters.to ? `${dayjs(filters.from).format("DD MMM YYYY")} - ${dayjs(filters.to).format("DD MMM YYYY")}` : "All Time"}
            </Text>
          </div>

          {/* Summary */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "120px", padding: "12px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Total Locations</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#0284c7" }}>{data.length}</div>
            </div>
            <div style={{ flex: 1, minWidth: "120px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Total Orders</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>
                {data.reduce((sum, c) => sum + c.order_count, 0)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "120px", padding: "12px", background: "#fefce8", borderRadius: "8px", border: "1px solid #fef9c3" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Total Revenue</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ca8a04" }}>
                KES {data.reduce((sum, c) => sum + c.total_amount, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>City</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>County</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Country</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Order No</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Customer</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Amount</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Status</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Date</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "600", color: "#475569" }}>Served By</th>
              </tr>
            </thead>
            <tbody>
              {data.map((location) =>
                location.orders.map((order: any, idx: number) => (
                  <tr key={`${location.country}-${location.county}-${location.city}-${order.order_no}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {idx === 0 && (
                      <>
                        <td rowSpan={location.orders.length} style={{ padding: "10px 8px", verticalAlign: "top", fontWeight: "600", color: "#1e293b", background: "#f8fafc" }}>
                          {String(location.city || "")}
                        </td>
                        <td rowSpan={location.orders.length} style={{ padding: "10px 8px", verticalAlign: "top", color: "#64748b", background: "#f8fafc" }}>
                          {String(location.county || "")}
                        </td>
                        <td rowSpan={location.orders.length} style={{ padding: "10px 8px", verticalAlign: "top", color: "#64748b", background: "#f8fafc" }}>
                          {String(location.country || "")}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "10px 8px", color: "#1e293b" }}>{String(order.order_no || "")}</td>
                    <td style={{ padding: "10px 8px", color: "#64748b" }}>{String(order.customer_name || "")} ({String(order.customer_phone || "")})</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", color: "#1e293b", fontWeight: "500" }}>KES {Number(order.order_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", color: "#64748b" }}>{String(order.order_type || "")}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ 
                        padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500",
                        background: order.status === "COMPLETED" ? "#dcfce7" : "#fed7aa",
                        color: order.status === "COMPLETED" ? "#16a34a" : "#ea580c"
                      }}>
                        {String(order.status || "")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#64748b" }}>{order.createdAt ? dayjs(order.createdAt).format("DD MMM YYYY HH:mm") : ""}</td>
                    <td style={{ padding: "10px 8px", color: "#64748b" }}>{String(order.served_by || "—")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: "11px" }}>
              Generated on {dayjs().format("DD MMM YYYY HH:mm")} • {String(systemSettings?.name || tenant?.business_name || "Business Name")}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersByLocation;
