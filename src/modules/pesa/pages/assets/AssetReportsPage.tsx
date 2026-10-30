import { useState } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Table,
  Tabs,
  Typography,
} from "antd";
import {
  FileTextOutlined,
  RiseOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import * as assetsApi from "src/services/accounting/assetsApi";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;
const { Title } = Typography;

const AssetReportsPage = () => {
  const [activeTab, setActiveTab] = useState("depreciation");
  const [filters, setFilters] = useState({
    fiscal_year: dayjs().year(),
    fiscal_month: dayjs().month() + 1,
    asset_category: "",
    from: "",
    to: "",
  });

  const { data: depreciationData, isLoading: depreciationLoading } = useQuery({
    queryKey: ["depreciation-report", filters],
    queryFn: () => assetsApi.getDepreciationReport(filters),
    enabled: activeTab === "depreciation",
  });

  const { data: appreciationData, isLoading: appreciationLoading } = useQuery({
    queryKey: ["appreciation-report", filters],
    queryFn: () => assetsApi.getAppreciationReport(filters),
    enabled: activeTab === "appreciation",
  });

  const { data: nbvData, isLoading: nbvLoading } = useQuery({
    queryKey: ["nbv-report", filters],
    queryFn: () => assetsApi.getNetBookValueReport(filters),
    enabled: activeTab === "nbv",
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["aging-report", filters],
    queryFn: () => assetsApi.getAssetAgingReport(filters),
    enabled: activeTab === "aging",
  });

  const { data: gainLossData, isLoading: gainLossLoading } = useQuery({
    queryKey: ["gain-loss-report", filters],
    queryFn: () => assetsApi.getGainLossReport(filters),
    enabled: activeTab === "gain-loss",
  });

  const { data: locationData, isLoading: locationLoading } = useQuery({
    queryKey: ["location-report", filters],
    queryFn: () => assetsApi.getAssetsByLocationReport(filters),
    enabled: activeTab === "location",
  });

  const { data: custodianData, isLoading: custodianLoading } = useQuery({
    queryKey: ["custodian-report", filters],
    queryFn: () => assetsApi.getAssetsByCustodianReport(filters),
    enabled: activeTab === "custodian",
  });

  const { data: disposalData, isLoading: disposalLoading } = useQuery({
    queryKey: ["disposal-report", filters],
    queryFn: () => assetsApi.getDisposalReport(filters),
    enabled: activeTab === "disposal",
  });

  const depreciationColumns = [
    { title: "Asset No", dataIndex: "asset_no", key: "asset_no" },
    { title: "Asset Name", dataIndex: "asset_name", key: "asset_name" },
    { title: "Category", dataIndex: "asset_category", key: "asset_category" },
    { title: "Purchase Cost", dataIndex: "purchase_cost", key: "purchase_cost", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Depreciation Rate", dataIndex: "depreciation_rate", key: "depreciation_rate", render: (val: number) => `${val}%` },
    { title: "Period Depreciation", dataIndex: "period_depreciation", key: "period_depreciation", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Accumulated Depreciation", dataIndex: "accumulated_depreciation", key: "accumulated_depreciation", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Net Book Value", dataIndex: "net_book_value", key: "net_book_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  const appreciationColumns = [
    { title: "Asset No", dataIndex: "asset_no", key: "asset_no" },
    { title: "Asset Name", dataIndex: "asset_name", key: "asset_name" },
    { title: "Previous Value", dataIndex: "previous_value", key: "previous_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "New Value", dataIndex: "new_value", key: "new_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Appreciation Amount", dataIndex: "appreciation_amount", key: "appreciation_amount", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Revaluation Date", dataIndex: "revaluation_date", key: "revaluation_date", render: (date: string) => dayjs(date).format("YYYY-MM-DD") },
    { title: "Reason", dataIndex: "reason", key: "reason" },
  ];

  const nbvColumns = [
    { title: "Asset No", dataIndex: "asset_no", key: "asset_no" },
    { title: "Asset Name", dataIndex: "asset_name", key: "asset_name" },
    { title: "Category", dataIndex: "asset_category", key: "asset_category" },
    { title: "Purchase Cost", dataIndex: "purchase_cost", key: "purchase_cost", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Accumulated Depreciation", dataIndex: "accumulated_depreciation", key: "accumulated_depreciation", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Net Book Value", dataIndex: "net_book_value", key: "net_book_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  const agingColumns = [
    { title: "Age Bucket", dataIndex: "age_bucket", key: "age_bucket" },
    { title: "Asset Count", dataIndex: "asset_count", key: "asset_count" },
    { title: "Total Cost", dataIndex: "total_cost", key: "total_cost", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Total NBV", dataIndex: "total_nbv", key: "total_nbv", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  const gainLossColumns = [
    { title: "Asset No", dataIndex: "asset_no", key: "asset_no" },
    { title: "Asset Name", dataIndex: "asset_name", key: "asset_name" },
    { title: "Disposal Date", dataIndex: "disposal_date", key: "disposal_date", render: (date: string) => dayjs(date).format("YYYY-MM-DD") },
    { title: "NBV at Disposal", dataIndex: "nbv_at_disposal", key: "nbv_at_disposal", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Disposal Price", dataIndex: "disposal_price", key: "disposal_price", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Gain/Loss", dataIndex: "gain_loss", key: "gain_loss", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  const locationColumns = [
    { title: "Location", dataIndex: "location", key: "location" },
    { title: "Asset Count", dataIndex: "asset_count", key: "asset_count" },
    { title: "Total Value", dataIndex: "total_value", key: "total_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Total NBV", dataIndex: "total_nbv", key: "total_nbv", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  const custodianColumns = [
    { title: "Custodian", dataIndex: "custodian_name", key: "custodian_name" },
    { title: "Asset Count", dataIndex: "asset_count", key: "asset_count" },
    { title: "Total Value", dataIndex: "total_value", key: "total_value", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Total NBV", dataIndex: "total_nbv", key: "total_nbv", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  const disposalColumns = [
    { title: "Asset No", dataIndex: "asset_no", key: "asset_no" },
    { title: "Asset Name", dataIndex: "asset_name", key: "asset_name" },
    { title: "Disposal Date", dataIndex: "disposal_date", key: "disposal_date", render: (date: string) => dayjs(date).format("YYYY-MM-DD") },
    { title: "Disposal Method", dataIndex: "disposal_method", key: "disposal_method" },
    { title: "Disposal Price", dataIndex: "disposal_price", key: "disposal_price", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
    { title: "Gain/Loss", dataIndex: "gain_loss", key: "gain_loss", render: (val: number, r: any) => `${r.currency} ${val?.toLocaleString()}` },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={3}>Asset Reports</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select
              placeholder="Fiscal Year"
              value={filters.fiscal_year}
              onChange={(value) => setFilters({ ...filters, fiscal_year: value })}
              style={{ width: "100%" }}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <Option key={i} value={dayjs().year() - i}>
                  {dayjs().year() - i}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Fiscal Month"
              value={filters.fiscal_month}
              onChange={(value) => setFilters({ ...filters, fiscal_month: value })}
              style={{ width: "100%" }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <Option key={i + 1} value={i + 1}>
                  Month {i + 1}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Asset Category"
              value={filters.asset_category}
              onChange={(value) => setFilters({ ...filters, asset_category: value })}
              style={{ width: "100%" }}
              allowClear
            >
              <Option value="Equipment">Equipment</Option>
              <Option value="Vehicles">Vehicles</Option>
              <Option value="Furniture">Furniture</Option>
              <Option value="IT Equipment">IT Equipment</Option>
              <Option value="Buildings">Buildings</Option>
              <Option value="Land">Land</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => {
                setFilters({
                  ...filters,
                  from: dates?.[0]?.format("YYYY-MM-DD") || "",
                  to: dates?.[1]?.format("YYYY-MM-DD") || "",
                });
              }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Depreciation Report
              </span>
            }
            key="depreciation"
          >
            <Table
              columns={depreciationColumns}
              dataSource={depreciationData?.depreciation || []}
              loading={depreciationLoading}
              rowKey="_id"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <RiseOutlined />
                Appreciation Report
              </span>
            }
            key="appreciation"
          >
            <Table
              columns={appreciationColumns}
              dataSource={appreciationData?.appreciation || []}
              loading={appreciationLoading}
              rowKey="_id"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarOutlined />
                Net Book Value Report
              </span>
            }
            key="nbv"
          >
            <Table
              columns={nbvColumns}
              dataSource={nbvData?.assets || []}
              loading={nbvLoading}
              rowKey="_id"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Asset Aging Report
              </span>
            }
            key="aging"
          >
            <Table
              columns={agingColumns}
              dataSource={agingData?.aging || []}
              loading={agingLoading}
              rowKey="age_bucket"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SwapOutlined />
                Gain/Loss Report
              </span>
            }
            key="gain-loss"
          >
            <Table
              columns={gainLossColumns}
              dataSource={gainLossData?.gain_loss || []}
              loading={gainLossLoading}
              rowKey="_id"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <EnvironmentOutlined />
                Assets by Location
              </span>
            }
            key="location"
          >
            <Table
              columns={locationColumns}
              dataSource={locationData?.by_location || []}
              loading={locationLoading}
              rowKey="location"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserOutlined />
                Assets by Custodian
              </span>
            }
            key="custodian"
          >
            <Table
              columns={custodianColumns}
              dataSource={custodianData?.by_custodian || []}
              loading={custodianLoading}
              rowKey="custodian_name"
              pagination={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DeleteOutlined />
                Disposal Report
              </span>
            }
            key="disposal"
          >
            <Table
              columns={disposalColumns}
              dataSource={disposalData?.disposals || []}
              loading={disposalLoading}
              rowKey="_id"
              pagination={false}
            />
          </TabPane>
        </Tabs>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button type="primary" icon={<DownloadOutlined />}>
            Export Report
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AssetReportsPage;
