import React, { useState } from "react";
import {
  Row,
  Col,
  Typography,
  Tag,
  Progress,
  Tabs,
  Table,
  Alert,
  Button,
  DatePicker,
  Space,
  Statistic,
  Select,
  Empty,
  Result,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ReloadOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ShopOutlined,
  DollarOutlined,
  BarChartOutlined,
  BranchesOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { getBusinessHealthScore } from "src/services/healthScore";
import { HealthScoreResult, MeasureItem } from "src/interfaces/healthScore";
import { ProcessingState } from "./ProcessingState";

const { Title, Text, Paragraph } = Typography;

const BAND_COLORS: Record<string, string> = {
  Strong: "#2e7d32",
  Healthy: "#7cb342",
  Watch: "#f9a825",
  Weak: "#ef6c00",
  Distressed: "#c62828",
};

const BAND_BG: Record<string, string> = {
  Strong: "#f6ffed",
  Healthy: "#f4fce3",
  Watch: "#fffbe6",
  Weak: "#fff7e6",
  Distressed: "#fff1f0",
};

const getScoreColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return "#94a3b8";
  if (score >= 75) return "#10b981";
  if (score >= 60) return "#84cc16";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
};

const formatCurrency = (val: number | null | undefined, currency = "KES") => {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return `${currency} ${Math.round(val).toLocaleString()}`;
};

export default function BusinessHealthScorePage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedDimensionFilter, setSelectedDimensionFilter] = useState<string>("all");
  const [isRecalculating, setIsRecalculating] = useState(false);

  const asOfStr = selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined;

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["businessHealthScore", asOfStr],
    queryFn: () => getBusinessHealthScore(false, asOfStr),
    staleTime: 1000 * 60 * 30, // 30 minutes cache in browser
    refetchOnWindowFocus: false,
  });

  const handleRecalculate = () => {
    setIsRecalculating(true);
    getBusinessHealthScore(true, asOfStr)
      .then(() => {
        refetch();
      })
      .finally(() => {
        setIsRecalculating(false);
      });
  };

  const result: HealthScoreResult | undefined = data?.data;
  const isCache = data?.source === "cache";

  if (isLoading || isRecalculating) {
    return (
      <ProcessingState
        title="Computing Comprehensive Business Health Audit"
        subtitle="Aggregating and analysing multi-product data across Duka (POS & Inventory), Pesa (Double-Entry Accounting), Bandu (Staff & Payroll), Mteja (CRM), and Dala (Properties)..."
      />
    );
  }

  if (error || (!result && !isLoading)) {
    const errorMsg =
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      "Unable to communicate with the scoring gateway.";
    return (
      <div style={{ padding: 24 }}>
        <Result
          status="warning"
          title="Business Health Diagnostic Unavailable"
          subTitle={errorMsg}
          extra={[
            <Button
              type="primary"
              key="retry"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
            >
              Retry Diagnostic
            </Button>,
          ]}
        />
      </div>
    );
  }

  if (!result) return null;

  const biz = result.business;
  const dimensionsList = Object.entries(result.dimensions || {});
  const filteredMeasures = (result.measures || []).filter((m) => {
    if (selectedDimensionFilter === "all") return true;
    return m.dimension === selectedDimensionFilter;
  });

  return (
    <div>
      {/* ── TOP HEADER / TOOLBAR ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SafetyCertificateOutlined style={{ fontSize: 26, color: "#10b981" }} />
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Business Health Diagnostic
            </Title>
            <Tag color={isCache ? "default" : "green"} style={{ borderRadius: 12 }}>
              {isCache ? "Cached Snapshot" : "Live Computation"}
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
            {biz.name || "Business"} ({biz.company_code}) · Evaluated as of{" "}
            <strong>{result.as_of}</strong> · Engine v{result.engine_version}
            {result.duration_seconds ? ` · computed in ${result.duration_seconds}s` : ""}
          </Text>
        </div>

        <Space wrap>
          <DatePicker
            value={selectedDate || dayjs(result.as_of)}
            disabledDate={(current) => current && current > dayjs().endOf("day")}
            onChange={(d) => setSelectedDate(d)}
            allowClear={false}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined spin={isFetching} />}
            loading={isFetching}
            onClick={handleRecalculate}
          >
            Recalculate Audit
          </Button>
        </Space>
      </div>

      {/* ── ALERTS: RED FLAGS & WARNINGS ── */}
      {result.red_flags?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {result.red_flags.map((flag, idx) => (
            <Alert
              key={idx}
              type="error"
              showIcon
              style={{ marginBottom: 8, borderRadius: 8 }}
              message={
                <span>
                  <strong>{flag.flag}</strong> — Score capped at <strong>{flag.cap} / 100</strong>
                </span>
              }
              description={flag.detail}
            />
          ))}
        </div>
      )}

      {result.scored_as?.note && (
        <Alert
          type="info"
          showIcon
          message="Evaluation Scope Note"
          description={result.scored_as.note}
          style={{ marginBottom: 18, borderRadius: 8 }}
        />
      )}

      {/* ── EXECUTIVE SUMMARY SCORECARD & 6 DIMENSIONS ── */}
      <Row gutter={[18, 18]} style={{ marginBottom: 20 }}>
        {/* Overall Score Hero Card */}
        <Col xs={24} lg={8}>
          <ProCard
            bordered
            style={{
              height: "100%",
              borderRadius: 14,
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              background: `linear-gradient(180deg, #ffffff 0%, ${BAND_BG[result.band] || "#f8fafc"} 100%)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              textAlign: "center",
              padding: "16px 0",
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Overall Business Health
            </Text>

            <div style={{ margin: "14px 0 10px" }}>
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: BAND_COLORS[result.band] || "#1e293b",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {result.score !== null ? Math.round(result.score) : "–"}
              </span>
              <span style={{ fontSize: 22, color: "#94a3b8", fontWeight: 600 }}> / 100</span>
            </div>

            {result.score !== null && result.score < result.score_uncapped && (
              <div style={{ marginBottom: 8 }}>
                <Tag color="error" style={{ borderRadius: 10 }}>
                  Capped from {result.score_uncapped.toFixed(1)} by Red Flag
                </Tag>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
              <Tag
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "4px 16px",
                  borderRadius: 20,
                  color: BAND_COLORS[result.band],
                  borderColor: BAND_COLORS[result.band],
                  backgroundColor: "#ffffff",
                }}
              >
                {result.band} Band
              </Tag>
              <Tag style={{ borderRadius: 20, padding: "4px 12px" }}>
                {result.confidence} Confidence
              </Tag>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                padding: "12px 16px 0",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Data Available</Text>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  {(result.measure_weight_available * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Active Products</Text>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  {(result.products_used || []).length} Modules
                </div>
              </div>
            </div>
          </ProCard>
        </Col>

        {/* 6 Dimensions Breakdown */}
        <Col xs={24} lg={16}>
          <ProCard
            bordered
            headerBordered
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChartOutlined style={{ color: "#3b82f6" }} />
                <span>Performance Across 6 Business Dimensions</span>
              </div>
            }
            style={{
              height: "100%",
              borderRadius: 14,
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dimensionsList.map(([key, dim]) => (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 13.5, color: "#1e293b" }}>
                        {dim.label}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        ({Math.round(dim.weight * 100)}% weight · {dim.measures_available}/{dim.measures_total} measures)
                      </Text>
                      {dim.imputed && (
                        <Tag color="orange" style={{ marginLeft: 6, fontSize: 10, borderRadius: 6 }}>
                          Imputed
                        </Tag>
                      )}
                    </div>
                    <Text strong style={{ fontSize: 14, color: getScoreColor(dim.score) }}>
                      {dim.score.toFixed(1)} / 100
                    </Text>
                  </div>
                  <Progress
                    percent={Math.round(dim.score)}
                    strokeColor={getScoreColor(dim.score)}
                    showInfo={false}
                    size={["100%", 9]}
                  />
                </div>
              ))}
            </div>
          </ProCard>
        </Col>
      </Row>

      {/* ── KEY DRIVERS: STRENGTHS & WEAKNESSES ── */}
      <Row gutter={[18, 18]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <ProCard
            bordered
            headerBordered
            title={
              <Space>
                <CheckCircleOutlined style={{ color: "#10b981" }} />
                <span>Key Business Strengths</span>
              </Space>
            }
            style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
          >
            {result.drivers.positive?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.drivers.positive.map((driver, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: "#f6ffed",
                      border: "1px solid #b7eb8f",
                    }}
                  >
                    <Text strong style={{ fontSize: 13, color: "#135200" }}>
                      {driver.measure}
                    </Text>
                    <Tag color="success" style={{ fontWeight: 700, margin: 0 }}>
                      Score: {Math.round(driver.score)}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">No standout strengths detected yet.</Text>
            )}
          </ProCard>
        </Col>

        <Col xs={24} md={12}>
          <ProCard
            bordered
            headerBordered
            title={
              <Space>
                <WarningOutlined style={{ color: "#ef4444" }} />
                <span>Priority Areas for Improvement</span>
              </Space>
            }
            style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
          >
            {result.drivers.negative?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.drivers.negative.map((driver, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: "#fff1f0",
                      border: "1px solid #ffa39e",
                    }}
                  >
                    <Text strong style={{ fontSize: 13, color: "#a8071a" }}>
                      {driver.measure}
                    </Text>
                    <Tag color="error" style={{ fontWeight: 700, margin: 0 }}>
                      Score: {Math.round(driver.score)}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">No priority weaknesses detected.</Text>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── DETAILED DRILLDOWN TABS ── */}
      <ProCard
        bordered
        style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
      >
        <Tabs
          defaultActiveKey="measures"
          items={[
            // Tab 1: 75 Measures Drilldown
            {
              key: "measures",
              label: (
                <span>
                  <AuditOutlined /> All Measures ({result.measures?.length || 0})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Text type="secondary">
                      Comprehensive 75-point audit computed from live operational records.
                    </Text>
                    <Select
                      value={selectedDimensionFilter}
                      onChange={(v) => setSelectedDimensionFilter(v)}
                      style={{ width: 260 }}
                      options={[
                        { label: "All Dimensions", value: "all" },
                        ...dimensionsList.map(([key, dim]) => ({
                          label: dim.label,
                          value: key,
                        })),
                      ]}
                    />
                  </div>

                  <Table<MeasureItem>
                    dataSource={filteredMeasures}
                    rowKey="id"
                    pagination={{ pageSize: 12, showSizeChanger: true }}
                    size="middle"
                    columns={[
                      {
                        title: "Measure",
                        dataIndex: "label",
                        key: "label",
                        render: (label, r) => (
                          <div>
                            <Text strong>{label}</Text>
                            {r.supplier && (
                              <Tag color="cyan" style={{ marginLeft: 6, fontSize: 10 }}>
                                Supplier
                              </Tag>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: "Dimension",
                        dataIndex: "dimension",
                        key: "dimension",
                        render: (dim) => result.dimensions[dim]?.label || dim,
                      },
                      {
                        title: "Calculated Value",
                        dataIndex: "value",
                        key: "value",
                        render: (val, r) => (
                          <span style={{ fontWeight: 600 }}>
                            {typeof val === "number" ? val.toLocaleString() : val} {r.unit}
                          </span>
                        ),
                      },
                      {
                        title: "Score",
                        dataIndex: "score",
                        key: "score",
                        sorter: (a, b) => a.score - b.score,
                        render: (score) => (
                          <Tag
                            color={getScoreColor(score)}
                            style={{ fontWeight: 700, borderRadius: 12, padding: "1px 10px" }}
                          >
                            {Math.round(score)} / 100
                          </Tag>
                        ),
                      },
                      {
                        title: "Weight in Dimension",
                        dataIndex: "weight_in_dimension",
                        key: "weight_in_dimension",
                        render: (w) => `${(w * 100).toFixed(1)}%`,
                      },
                      {
                        title: "Impact on Score",
                        dataIndex: "weight_in_score",
                        key: "weight_in_score",
                        render: (w) => `${(w * 100).toFixed(2)}%`,
                      },
                    ]}
                  />
                </div>
              ),
            },

            // Tab 2: Branch & Shop Comparison
            {
              key: "shops",
              label: (
                <span>
                  <ShopOutlined /> Branches & Shops ({result.shops?.length || 0})
                </span>
              ),
              children: (
                <div>
                  {result.shop_network && (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message={
                        <span>
                          <strong>Shop Network Score: {result.shop_network.score.toFixed(1)} / 100</strong>{" "}
                          ({result.shop_network.shops_compared} branches compared)
                        </span>
                      }
                    />
                  )}
                  <Table
                    dataSource={result.shops || []}
                    rowKey="shop_id"
                    pagination={false}
                    columns={[
                      {
                        title: "Branch Name",
                        dataIndex: "name",
                        key: "name",
                        render: (name) => <Text strong>{name || "Unnamed Branch"}</Text>,
                      },
                      {
                        title: "Branch Type",
                        dataIndex: "pos_mode",
                        key: "pos_mode",
                        render: (mode) => (mode ? <Tag>{mode.toUpperCase()}</Tag> : "–"),
                      },
                      {
                        title: "Health Score",
                        dataIndex: "score",
                        key: "score",
                        render: (score) =>
                          score !== null ? (
                            <Tag
                              color={getScoreColor(score)}
                              style={{ fontWeight: 700, borderRadius: 12 }}
                            >
                              {score.toFixed(1)} / 100
                            </Tag>
                          ) : (
                            "–"
                          ),
                      },
                      {
                        title: "Band",
                        dataIndex: "band",
                        key: "band",
                        render: (b) => (b ? <Tag color={BAND_COLORS[b]}>{b}</Tag> : "–"),
                      },
                      {
                        title: "Share of Total Revenue",
                        dataIndex: "revenue_share",
                        key: "revenue_share",
                        render: (share) => `${(share * 100).toFixed(1)}%`,
                      },
                      {
                        title: "Revenue (Last 3m)",
                        dataIndex: "revenue_t3m",
                        key: "revenue_t3m",
                        render: (val) => formatCurrency(val, biz.base_currency),
                      },
                      {
                        title: "Growth Trend",
                        dataIndex: "declining",
                        key: "declining",
                        render: (declining) =>
                          declining ? (
                            <Tag color="error">Declining Trend</Tag>
                          ) : (
                            <Tag color="success">Stable / Growing</Tag>
                          ),
                      },
                    ]}
                  />
                </div>
              ),
            },

            // Tab 3: Aging Buckets (Receivables vs Payables)
            {
              key: "aging",
              label: (
                <span>
                  <DollarOutlined /> Aging Ledgers
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {Object.entries(result.aging || {}).map(([name, buckets]) => (
                    <Col xs={24} md={12} key={name}>
                      <ProCard
                        bordered
                        headerBordered
                        title={
                          <span style={{ textTransform: "capitalize" }}>
                            {name} Aging Analysis
                          </span>
                        }
                        style={{ borderRadius: 10 }}
                      >
                        {buckets && Object.keys(buckets).length > 0 ? (
                          <Table
                            dataSource={Object.entries(buckets).map(([bucket, amount]) => ({
                              bucket,
                              amount,
                            }))}
                            rowKey="bucket"
                            pagination={false}
                            size="small"
                            columns={[
                              { title: "Aging Period", dataIndex: "bucket", key: "bucket" },
                              {
                                title: "Outstanding Amount",
                                dataIndex: "amount",
                                key: "amount",
                                render: (amt) => (
                                  <Text strong>{formatCurrency(amt, biz.base_currency)}</Text>
                                ),
                              },
                            ]}
                          />
                        ) : (
                          <Empty description="No aging records found" />
                        )}
                      </ProCard>
                    </Col>
                  ))}
                </Row>
              ),
            },

            // Tab 4: Supplier Traceability
            {
              key: "suppliers",
              label: (
                <span>
                  <BranchesOutlined /> Supplier Traceability
                </span>
              ),
              children: (
                <div>
                  {result.context?.supplier_tracking ? (
                    <div>
                      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={8}>
                          <ProCard bordered style={{ textAlign: "center", borderRadius: 10 }}>
                            <Statistic
                              title="Supply Chain Traceability"
                              value={
                                result.context.supplier_tracking.traceability_index !== null
                                  ? Math.round(result.context.supplier_tracking.traceability_index)
                                  : "–"
                              }
                              suffix="/ 100"
                              valueStyle={{ color: "#10b981", fontWeight: 700 }}
                            />
                          </ProCard>
                        </Col>
                        <Col xs={24} sm={8}>
                          <ProCard bordered style={{ textAlign: "center", borderRadius: 10 }}>
                            <Statistic
                              title="Purchases from Tracked Suppliers"
                              value={Math.round(
                                (result.context.supplier_tracking.tracking_share || 0) * 100
                              )}
                              suffix="%"
                            />
                          </ProCard>
                        </Col>
                        <Col xs={24} sm={8}>
                          <ProCard bordered style={{ textAlign: "center", borderRadius: 10 }}>
                            <Statistic
                              title="Purchases (Last 12 Months)"
                              value={Math.round(
                                result.context.supplier_tracking.purchase_value_12m || 0
                              )}
                              prefix={biz.base_currency}
                            />
                          </ProCard>
                        </Col>
                      </Row>

                      <Table
                        dataSource={Object.entries(
                          result.context.supplier_tracking.tier_counts || {}
                        ).map(([tier, count]) => ({ tier: `Tier ${tier}`, count }))}
                        rowKey="tier"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: "Supplier Tier", dataIndex: "tier", key: "tier" },
                          { title: "Supplier Count", dataIndex: "count", key: "count" },
                        ]}
                      />
                      <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10 }}>
                        Tier 1: purchases recorded · Tier 2: inventory linked to supplier · Tier 3:
                        full chain (delivery, bill, payment) with item sales.
                      </Paragraph>
                    </div>
                  ) : (
                    <Empty description="No supplier tracking data" />
                  )}
                </div>
              ),
            },

            // Tab 5: Data Coverage & Diagnostics
            {
              key: "diagnostics",
              label: (
                <span>
                  <InfoCircleOutlined /> Data Coverage & Diagnostics
                </span>
              ),
              children: (
                <div>
                  <Paragraph type="secondary">
                    Health of the {result.data_coverage?.length || 0} BASEPOINT API endpoints queried during this assessment.
                  </Paragraph>
                  <Table
                    dataSource={result.data_coverage || []}
                    rowKey="endpoint"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    columns={[
                      { title: "API Endpoint", dataIndex: "endpoint", key: "endpoint" },
                      { title: "Requests", dataIndex: "calls", key: "calls" },
                      {
                        title: "Successful",
                        dataIndex: "ok",
                        key: "ok",
                        render: (ok, r: any) =>
                          ok === r.calls ? (
                            <Tag color="success">{ok} / {r.calls}</Tag>
                          ) : (
                            <Tag color="warning">{ok} / {r.calls}</Tag>
                          ),
                      },
                      { title: "Records Fetched", dataIndex: "records", key: "records" },
                      {
                        title: "Errors",
                        dataIndex: "errors",
                        key: "errors",
                        render: (errs: string[]) =>
                          errs && errs.length > 0 ? (
                            <Text type="danger">{errs.join("; ")}</Text>
                          ) : (
                            <Text type="secondary">None</Text>
                          ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </ProCard>
    </div>
  );
}
