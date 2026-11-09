import React, { useState } from "react";
import { Space, Typography, Button, Radio, DatePicker, Drawer, Select } from "antd";
import {
  MessageOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FilterOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { CUSTOM_RANGE_PRESETS } from "src/utils/dateRangePresets";
import { PERIOD_LABELS, C } from "./constants";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export interface MtejaHeaderProps {
  periodFilter: string;
  onPeriodChange: (val: string) => void;
  customDateRange: any[];
  onCustomDateRangeChange: (dates: any) => void;
  showCustomPicker: boolean;
  onToggleCustomPicker: () => void;
  dateRangeLabel: string;
  selectedShopId: string;
  onShopChange: (val: string) => void;
  shops: any[];
  isAdminLayout: boolean;
  isMobile: boolean;
  onRefresh: () => void;
  isRefetching: boolean;
}

export const MtejaHeader: React.FC<MtejaHeaderProps> = ({
  periodFilter,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
  showCustomPicker,
  onToggleCustomPicker,
  dateRangeLabel,
  selectedShopId,
  onShopChange,
  shops,
  isAdminLayout,
  isMobile,
  onRefresh,
  isRefetching,
}) => {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const branchOptions = [
    { label: "All Branches & Outlets", value: "" },
    ...shops.map((s: any) => ({ label: s.name, value: s._id })),
  ];

  const selectedShopName = selectedShopId
    ? shops.find((s: any) => s._id === selectedShopId)?.name || "Selected Branch"
    : "All Branches & Outlets";

  return (
    <>
      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        title="Filter Period & Branch"
        placement="bottom"
        height="auto"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{ body: { paddingBottom: 32 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {isAdminLayout && (
            <div>
              <Text style={{ fontSize: 12, color: C.subtext, display: "block", marginBottom: 6 }}>
                Branch / Outlet
              </Text>
              <Select
                value={selectedShopId}
                onChange={(val) => {
                  onShopChange(val);
                  setFilterDrawerOpen(false);
                }}
                showSearch
                placeholder="Branch / Outlet"
                suffixIcon={<ShopOutlined style={{ color: C.primary }} />}
                options={branchOptions}
                filterOption={(input, opt) =>
                  String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
              />
            </div>
          )}
          <div>
            <Text style={{ fontSize: 12, color: C.subtext, display: "block", marginBottom: 6 }}>
              Time Period
            </Text>
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
          </div>
          {showCustomPicker && (
            <RangePicker
              value={customDateRange as any}
              presets={CUSTOM_RANGE_PRESETS}
              onChange={(dates) => {
                onCustomDateRangeChange(dates || []);
                if (dates && dates.length === 2) setFilterDrawerOpen(false);
              }}
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Control Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isMobile ? 14 : 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 10,
              padding: isMobile ? "6px 8px" : "8px 10px",
              color: "#3b82f6",
              fontSize: isMobile ? 18 : 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageOutlined />
          </div>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: C.text, fontWeight: 600 }}>
              Mteja CRM Dashboard
            </Title>
            <Text style={{ fontSize: 12, color: C.subtext }}>
              {dateRangeLabel} · {isAdminLayout ? selectedShopName : "Customer Engagement & Omnichannel Leads"}
            </Text>
          </div>
        </Space>

        <Space size={8} wrap>
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
                type="primary"
                icon={<ReloadOutlined spin={isRefetching} />}
                onClick={onRefresh}
                size="middle"
              />
            </>
          ) : (
            <>
              {isAdminLayout && (
                <Select
                  value={selectedShopId}
                  onChange={onShopChange}
                  showSearch
                  placeholder="Branch / Outlet"
                  suffixIcon={<ShopOutlined style={{ color: C.primary }} />}
                  options={branchOptions}
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ minWidth: 175 }}
                  size="small"
                />
              )}
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
                <CalendarOutlined style={{ color: C.primary, fontSize: 13 }} />
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
                  <Radio.Button value="custom" onClick={onToggleCustomPicker}>
                    Custom
                  </Radio.Button>
                </Radio.Group>
              </div>

              {showCustomPicker && (
                <RangePicker
                  value={customDateRange as any}
                  presets={CUSTOM_RANGE_PRESETS}
                  onChange={(dates) => onCustomDateRangeChange(dates || [])}
                  size="small"
                  style={{ minWidth: 230 }}
                />
              )}

              <Button
                size="small"
                icon={<ReloadOutlined spin={isRefetching} />}
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
