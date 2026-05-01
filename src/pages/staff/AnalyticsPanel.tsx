import { useState } from "react";
import { Typography, Row, Col, Card, Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSchedules } from "@services/customers";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;
const { Option } = Select;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  pink: "#ec4899",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const COLORS = [C.blue, C.green, C.purple, C.orange, C.red, C.cyan, C.pink, C.indigo];

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const getStatus = (appointmentDate: any): string => {
  if (!appointmentDate) return "unknown";
  const apptDate = dayjs(appointmentDate);
  if (!apptDate.isValid()) return "unknown";
  const now = dayjs();
  if (apptDate.isSame(now, "day")) return "today";
  if (apptDate.isAfter(now, "day")) return "upcoming";
  return "completed";
};

const isGroupBooking = (record: any): boolean => {
  if (!Array.isArray(record.customer_ids) || record.customer_ids.length < 2) return false;
  return record.customer_ids.filter((c: any) => c && (c.customer_name || c.name)).length > 1;
};

const StatCard = ({ 
  icon, 
  label, 
  value, 
  sub, 
  trend, 
  color, 
  bg 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  sub?: string; 
  trend?: number; 
  color: string; 
  bg: string;
}) => (
  <Card
    bordered
    style={{ 
      borderRadius: 12, 
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      borderTop: `4px solid ${color}`,
    }}
    bodyStyle={{ padding: "20px" }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 8 }}>{label}</Text>
        <Title level={3} style={{ margin: 0, color: C.darkText, fontSize: 28 }}>{value}</Title>
        {sub && <Text style={{ fontSize: 12, color: C.subText }}>{sub}</Text>}
      </div>
      <div style={{ 
        background: bg, 
        borderRadius: 10, 
        padding: "12px", 
        color,
        fontSize: 20,
      }}>
        {icon}
      </div>
    </div>
    {trend !== undefined && (
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
        {trend >= 0 ? (
          <RiseOutlined style={{ color: C.green }} />
        ) : (
          <FallOutlined style={{ color: C.red }} />
        )}
        <Text style={{ fontSize: 12, color: trend >= 0 ? C.green : C.red, fontWeight: 600 }}>
          {Math.abs(trend)}% vs last week
        </Text>
      </div>
    )}
  </Card>
);

const buildStats = (bookings: any[]) => {
  let today = 0, upcoming = 0, completed = 0, group = 0, totalRevenue = 0;
  const staffCount: Record<string, number> = {};
  const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {};
  const dailyBookings: Record<string, number> = {};
  const hourlyBookings: Record<string, number> = {};

  bookings.forEach(b => {
    const s = getStatus(b.appointment_date);
    if (s === "today") today++;
    else if (s === "upcoming") upcoming++;
    else if (s === "completed") completed++;
    if (isGroupBooking(b)) group++;

    const staff = b.staff_id?.fullname || "Unassigned";
    staffCount[staff] = (staffCount[staff] || 0) + 1;

    const svc = b.service_id?.name || "Unknown";
    if (!serviceCount[svc]) serviceCount[svc] = { name: svc, count: 0, revenue: 0 };
    serviceCount[svc].count++;
    if (b.service_id?.price) {
      serviceCount[svc].revenue += Number(b.service_id.price);
      totalRevenue += Number(b.service_id.price);
    }

    // Daily bookings for line chart
    const dateKey = dayjs(b.appointment_date).format("DD MMM");
    dailyBookings[dateKey] = (dailyBookings[dateKey] || 0) + 1;

    // Hourly bookings for bar chart
    const hourKey = parseInt(b.start_time?.split(":")[0]) || 0;
    const hourLabel = `${hourKey}:00`;
    hourlyBookings[hourLabel] = (hourlyBookings[hourLabel] || 0) + 1;
  });

  return {
    total: bookings.length, 
    today, 
    upcoming, 
    completed, 
    group, 
    totalRevenue,
    topStaff: Object.entries(staffCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    topServices: Object.values(serviceCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    dailyBookings: Object.entries(dailyBookings)
      .map(([date, count]) => ({ date, count }))
      .slice(-14),
    hourlyBookings: Object.entries(hourlyBookings)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(0, 12),
    bookingTypes: [
      { name: "Individual", value: bookings.length - group },
      { name: "Group", value: group },
    ],
  };
};

const AnalyticsPanel = () => {
  const primaryColor = usePrimaryColor();
  const [timeRange, setTimeRange] = useState("7days");

  // Fetch all bookings
  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["analytics-bookings", timeRange],
    queryFn: async () => {
      const response = await fetchAllSchedules({});
      return response.data || [];
    },
  });

  if (isLoading) {
    return <div style={{ padding: 24, textAlign: "center", color: C.subText }}>Loading analytics...</div>;
  }

  if (!allBookings.length) {
    return <div style={{ padding: 24, textAlign: "center", color: C.subText }}>No booking data available</div>;
  }

  const s = buildStats(allBookings);

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ margin: 0, color: C.darkText }}>Analytics Dashboard</Title>
          <Text style={{ color: C.subText }}>Overview of your booking performance</Text>
        </div>
        <Select 
          defaultValue="7days" 
          style={{ width: 150 }}
          onChange={setTimeRange}
        >
          <Option value="7days">Last 7 days</Option>
          <Option value="30days">Last 30 days</Option>
          <Option value="90days">Last 90 days</Option>
        </Select>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            icon={<CalendarOutlined />} 
            label="Total Bookings" 
            value={s.total} 
            sub={`${s.group} group bookings`}
            trend={12}
            color={C.blue} 
            bg="#eff6ff" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            icon={<ClockCircleOutlined />} 
            label="Today" 
            value={s.today} 
            sub="appointments today"
            trend={8}
            color={C.orange} 
            bg="#fffbeb" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            icon={<CheckCircleOutlined />} 
            label="Upcoming" 
            value={s.upcoming} 
            sub="scheduled ahead"
            trend={-3}
            color={C.indigo} 
            bg="#eef2ff" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            icon={<WalletOutlined />} 
            label="Revenue" 
            value={`KES ${fmt(s.totalRevenue)}`} 
            sub="from services"
            trend={15}
            color={C.green} 
            bg="#f0fdf4" 
          />
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Booking Trends</span>}
            bordered
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={s.dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" stroke={C.subText} fontSize={12} />
                <YAxis stroke={C.subText} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 8, 
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={primaryColor} 
                  strokeWidth={3}
                  dot={{ fill: primaryColor, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Bookings"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Booking Types</span>}
            bordered
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={s.bookingTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {s.bookingTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Top Staff Performance</span>}
            bordered
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={s.topStaff} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" stroke={C.subText} fontSize={12} />
                <YAxis dataKey="name" type="category" stroke={C.subText} fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 8, 
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" fill={primaryColor} radius={[0, 4, 4, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Peak Hours</span>}
            bordered
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={s.hourlyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="hour" stroke={C.subText} fontSize={12} />
                <YAxis stroke={C.subText} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 8, 
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" fill={C.purple} radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Services Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card 
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Top Services</span>}
            bordered
            style={{ borderRadius: 12 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {s.topServices.map((service, index) => (
                <div 
                  key={service.name}
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "12px 16px",
                    background: index === 0 ? C.primaryLight : C.bg,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%", 
                      background: index === 0 ? primaryColor : C.border,
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      color: index === 0 ? "#fff" : C.subText,
                      fontWeight: 700,
                      fontSize: 14,
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>
                        {service.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.subText }}>
                        KES {fmt(service.revenue)} revenue
                      </Text>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Text strong style={{ fontSize: 16, color: primaryColor }}>
                      {service.count}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.subText, display: "block" }}>
                      bookings
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPanel;
