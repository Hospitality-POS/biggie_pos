import React from "react";
import { Typography, Space, Button, Radio, DatePicker, Drawer } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  FilterOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { BranchSelect } from "@components/BranchFilter/BranchFilter";
import { CUSTOM_RANGE_PRESETS } from "src/utils/dateRangePresets";
import { PERIOD_LABELS } from "./constants";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface PesaHeaderProps {
  isMobile: boolean;
  primaryColor: string;
  periodFilter: string;
  onPeriodChange: (val: string) => void;
  customDateRange: any[];
  onCustomDateRangeChange: (dates: any) => void;
  showCustomDatePicker: boolean;
  filterDrawerOpen: boolean;
  setFilterDrawerOpen: (open: boolean) => void;
  formattedDateRange: string;
  isFetching: boolean;
  onRefresh: () => void;
  showFilter: boolean;
  shops: { _id: string; name: string }[];
  branchId: string;
  onBranchChange: (val: string) => void;
  branchName?: string;
}

export const PesaHeader: React.FC<PesaHeaderProps> = ({
  isMobile,
  primaryColor,
  periodFilter,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
  showCustomDatePicker,
  filterDrawerOpen,
  setFilterDrawerOpen,
  formattedDateRange,
  isFetching,
  onRefresh,
  showFilter,
  shops,
  branchId,
  onBranchChange,
  branchName,
}) => {
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
            onChange={(e) => onPeriodChange(e.target.value)}
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
              onChange={onCustomDateRangeChange}
              allowClear
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Top Deck Header & Controls ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isMobile ? 14 : 20,
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
            }}
          >
            <DashboardOutlined />
          </div>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a" }}>
              {PERIOD_LABELS[periodFilter]} · Pesa
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {formattedDateRange} ·{" "}
              {branchName ? `${branchName} · ` : showFilter ? "All branches · " : ""}
              Financial overview & general ledger
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
              <Button
                type="primary"
                icon={<SyncOutlined spin={isFetching} />}
                onClick={onRefresh}
                size="middle"
              />
            </>
          ) : (
            <>
              {showFilter && (
                <BranchSelect shops={shops} value={branchId} onChange={onBranchChange} />
              )}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                  style={{ minWidth: 240 }}
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
