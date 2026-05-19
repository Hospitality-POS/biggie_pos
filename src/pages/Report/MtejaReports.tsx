import React, { useState } from "react";
import { Tabs, Typography, Card, Row, Col, Statistic, Table, Tag, DatePicker } from "antd";
import {
  TeamOutlined,
  NotificationOutlined,
  AimOutlined,
  RiseOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchAllLeads } from "@services/crm/leads";
import { fetchAllCampaigns } from "@services/crm/campaigns";
import { fetchAllSalesTargets } from "@services/crm/salesTargets";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Leads Conversion Report ─────────────────────────────────────────────────────
const LeadsConversionReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads-report", dateRange],
    queryFn: () => fetchAllLeads({}),
  });

  const leads = Array.isArray(leadsData) ? leadsData : leadsData?.leads || [];

  const leadStats = leads?.reduce(
    (acc: any, lead: any) => {
      acc.total += 1;
      if (lead.status === "converted") acc.converted += 1;
      if (lead.status === "in_progress") acc.inProgress += 1;
      if (lead.status === "new") acc.new += 1;
      return acc;
    },
    { total: 0, converted: 0, inProgress: 0, new: 0 }
  );

  const conversionRate = leadStats?.total > 0 ? (leadStats.converted / leadStats.total) * 100 : 0;

  const columns = [
    {
      title: "Lead Name",
      dataIndex: "name",
      render: (name: string) => <Text style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          converted: "green",
          in_progress: "blue",
          new: "orange",
          lost: "red",
        };
        return <Tag color={colorMap[status] || "default"}>{status?.replace(/_/g, " ")}</Tag>;
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      render: (source: string) => <Text style={{ fontSize: 12, color: C.subText }}>{source || "—"}</Text>,
    },
    {
      title: "Assigned To",
      dataIndex: "assigned_to",
      render: (assigned: any) => (
        <Text style={{ fontSize: 12 }}>
          {assigned?.fullname || assigned?.username || assigned?.name || assigned || "—"}
        </Text>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "created_at",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text strong style={{ fontSize: 14 }}>Leads Conversion Report</Text>
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ borderRadius: 8 }}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Leads"
              value={leadStats?.total || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Converted"
              value={leadStats?.converted || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={leadStats?.inProgress || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Conversion Rate"
              value={conversionRate.toFixed(1)}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: C.primary, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={leads || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Campaign Performance Report ─────────────────────────────────────────────────
const CampaignPerformanceReport: React.FC = () => {
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["campaigns-report"],
    queryFn: () => fetchAllCampaigns({}),
  });

  const campaigns = Array.isArray(campaignsData) ? campaignsData : campaignsData?.campaigns || [];

  const columns = [
    {
      title: "Campaign Name",
      dataIndex: "name",
      render: (name: string) => <Text strong style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: "green",
          scheduled: "blue",
          completed: "default",
          cancelled: "red",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type: string) => <Text style={{ fontSize: 12 }}>{type || "—"}</Text>,
    },
    {
      title: "Budget",
      dataIndex: "budget",
      render: (budget: number) => (
        <Text style={{ fontSize: 13 }}>
          {budget ? `KES ${budget.toLocaleString()}` : "—"}
        </Text>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>Campaign Performance Report</Text>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={campaigns || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Sales Targets Report ────────────────────────────────────────────────────────
const SalesTargetsReport: React.FC = () => {
  const { data: targetsData, isLoading } = useQuery({
    queryKey: ["sales-targets-report"],
    queryFn: () => fetchAllSalesTargets({}),
  });

  const targets = Array.isArray(targetsData) ? targetsData : targetsData?.targets || [];

  const columns = [
    {
      title: "Target Name",
      dataIndex: "name",
      render: (name: string) => <Text strong style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type: string) => (
        <Tag color="blue">{type?.replace(/_/g, " ")}</Tag>
      ),
    },
    {
      title: "Target Value",
      dataIndex: "target_value",
      render: (value: number, record: any) => {
        const isMoney = (record as any).type === "revenue" || (record as any).type === "gross_profit";
        return (
          <Text style={{ fontSize: 13 }}>
            {isMoney ? `KES ${value?.toLocaleString()}` : value}
          </Text>
        );
      },
    },
    {
      title: "Current Value",
      dataIndex: "current_value",
      render: (value: number, record: any) => {
        const isMoney = (record as any).type === "revenue" || (record as any).type === "gross_profit";
        return (
          <Text style={{ fontSize: 13 }}>
            {isMoney ? `KES ${value?.toLocaleString()}` : value}
          </Text>
        );
      },
    },
    {
      title: "Achievement",
      dataIndex: "achievement_percentage",
      render: (pct: number) => {
        const color = pct >= 100 ? C.green : pct >= 70 ? C.orange : C.red;
        return (
          <div style={{ minWidth: 100 }}>
            <Text style={{ fontSize: 12, color }}>{pct?.toFixed(1)}%</Text>
            <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(pct || 0, 100)}%`,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Period",
      dataIndex: "period",
      render: (period: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>{period}</Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>Sales Targets Report</Text>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={targets || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Customer Analytics Report ────────────────────────────────────────────────────
const CustomerAnalyticsReport: React.FC = () => {
  const { data: leadsData } = useQuery({
    queryKey: ["customer-analytics-leads"],
    queryFn: () => fetchAllLeads({}),
  });

  const leads = Array.isArray(leadsData) ? leadsData : leadsData?.leads || [];

  const customerStats = leads?.reduce(
    (acc: any, lead: any) => {
      acc.total += 1;
      if (lead.status === "converted") {
        acc.converted += 1;
        if (lead.source) acc.sources[lead.source] = (acc.sources[lead.source] || 0) + 1;
      }
      return acc;
    },
    { total: 0, converted: 0, sources: {} as Record<string, number> }
  );

  const sourceData = Object.entries(customerStats?.sources || {}).map(([source, count]) => ({
    source,
    count,
    percentage: ((count / customerStats.converted) * 100).toFixed(1),
  }));

  const sourceColumns = [
    {
      title: "Source",
      dataIndex: "source",
      render: (source: string) => <Text strong style={{ fontSize: 13 }}>{source}</Text>,
    },
    {
      title: "Customers",
      dataIndex: "count",
      render: (count: any) => <Text style={{ fontSize: 13 }}>{count}</Text>,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      render: (pct: string) => <Text style={{ fontSize: 13 }}>{pct}%</Text>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>Customer Analytics Report</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Prospects"
              value={customerStats?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Converted Customers"
              value={customerStats?.converted || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Conversion Rate"
              value={
                customerStats?.total > 0
                  ? ((customerStats.converted / customerStats.total) * 100).toFixed(1)
                  : 0
              }
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: C.primary, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Customer Sources Breakdown">
        <Table
          columns={sourceColumns}
          dataSource={sourceData}
          rowKey="source"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Main Mteja Reports Component ─────────────────────────────────────────────────
const MtejaReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("leads");

  const tabItems = [
    {
      key: "leads",
      label: (
        <span>
          <TeamOutlined /> Leads Conversion
        </span>
      ),
      children: <LeadsConversionReport />,
    },
    {
      key: "campaigns",
      label: (
        <span>
          <NotificationOutlined /> Campaign Performance
        </span>
      ),
      children: <CampaignPerformanceReport />,
    },
    {
      key: "targets",
      label: (
        <span>
          <AimOutlined /> Sales Targets
        </span>
      ),
      children: <SalesTargetsReport />,
    },
    {
      key: "analytics",
      label: (
        <span>
          <RiseOutlined /> Customer Analytics
        </span>
      ),
      children: <CustomerAnalyticsReport />,
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 20 }}
      />
    </div>
  );
};

export default MtejaReports;
