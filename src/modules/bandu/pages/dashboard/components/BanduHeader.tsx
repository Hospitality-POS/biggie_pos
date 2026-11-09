import React, { useState } from "react";
import {
  Space,
  Typography,
  Button,
  Radio,
  DatePicker,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  SyncOutlined,
  FilterOutlined,
  QrcodeOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { BranchSelect } from "@components/BranchFilter/BranchFilter";
import { CUSTOM_RANGE_PRESETS } from "@utils/dateRangePresets";
import { PERIOD_LABELS } from "./constants";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export interface BanduHeaderProps {
  periodFilter: string;
  onPeriodChange: (val: string) => void;
  customDateRange: any[];
  onCustomDateRangeChange: (dates: any) => void;
  showCustomDatePicker: boolean;
  formattedDateRange: string;
  branchName?: string;
  isAdmin: boolean;
  isMobile: boolean;
  primaryColor: string;
  showFilter: boolean;
  shops: any[];
  branchId: string;
  onBranchChange: (id: string) => void;
  clockStatus?: { clocked_in?: boolean };
  onClockIn: () => void;
  onClockOut: () => void;
  onOpenKioskModal: () => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export const BanduHeader: React.FC<BanduHeaderProps> = ({
  periodFilter,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
  showCustomDatePicker,
  formattedDateRange,
  branchName,
  isAdmin,
  isMobile,
  primaryColor,
  showFilter,
  shops,
  branchId,
  onBranchChange,
  clockStatus,
  onClockIn,
  onClockOut,
  onOpenKioskModal,
  onRefresh,
  isFetching,
}) => {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  return (
    <>
      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        title={showFilter ? "Filter Period & Branch" : "Filter Period"}
        placement="bottom"
        height="auto"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{ body: { paddingBottom: 32 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {showFilter && (
            <BranchSelect
              shops={shops}
              value={branchId}
              size="middle"
              block
              onChange={(v) => {
                onBranchChange(v);
                setFilterDrawerOpen(false);
              }}
            />
          )}
          <Radio.Group
            value={periodFilter}
            onChange={(e) => {
              onPeriodChange(e.target.value);
              if (e.target.value !== "custom") setFilterDrawerOpen(false);
            }}
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
              presets={CUSTOM_RANGE_PRESETS}
              onChange={(d) => {
                onCustomDateRangeChange(d || []);
                if (d && d.length === 2) setFilterDrawerOpen(false);
              }}
              allowClear
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Header & Control Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 10,
              padding: isMobile ? "6px 8px" : "8px 10px",
              color: primaryColor,
              fontSize: isMobile ? 18 : 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DashboardOutlined />
          </div>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a" }}>
              {PERIOD_LABELS[periodFilter]} · Bandu HR{isAdmin && " (Admin)"}
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {formattedDateRange} · {branchName ? `${branchName} HR overview` : isAdmin ? "Company-wide HR overview" : "HR overview"}
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
                {PERIOD_LABELS[periodFilter] || "Filter"}
              </Button>
              <Button
                icon={<QrcodeOutlined />}
                onClick={onOpenKioskModal}
                size="middle"
              />
              {clockStatus?.clocked_in ? (
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={onClockOut}
                  size="middle"
                >
                  Clock Out
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={onClockIn}
                  size="middle"
                >
                  Clock In
                </Button>
              )}
              <Button
                type="primary"
                icon={<SyncOutlined spin={isFetching} />}
                onClick={onRefresh}
                size="middle"
              />
            </>
          ) : (
            <>
              <Button
                icon={<QrcodeOutlined />}
                onClick={onOpenKioskModal}
                size="small"
              >
                Staff Kiosk / QR
              </Button>
              {clockStatus?.clocked_in ? (
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={onClockOut}
                  size="small"
                >
                  Clock Out
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={onClockIn}
                  size="small"
                >
                  Clock In
                </Button>
              )}

              {showFilter && <BranchSelect shops={shops} value={branchId} onChange={onBranchChange} />}

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "3px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <CalendarOutlined style={{ color: primaryColor, fontSize: 13 }} />
                <Radio.Group
                  value={periodFilter}
                  onChange={(e) => onPeriodChange(e.target.value)}
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
                  presets={CUSTOM_RANGE_PRESETS}
                  onChange={onCustomDateRangeChange}
                  allowClear
                  style={{ minWidth: 230 }}
                  size="small"
                />
              )}

              <Button
                size="small"
                icon={<SyncOutlined spin={isFetching} />}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </>
          )}
        </Space>
      </div>
    </>
  );
};
