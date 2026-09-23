import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, Button, Grid, List, Select, Space, Spin, Tag, Typography, Switch, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ApiOutlined, CheckCircleOutlined,
  PrinterOutlined, ReloadOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
  DownloadOutlined, AppleOutlined, WindowsOutlined, SettingOutlined,
} from "@ant-design/icons";
import {
  getConnectedAgents, sendPrintJob,
  getCategoryPrinterMappings, setCategoryPrinterMapping, removeCategoryPrinterMapping,
  type ConnectedAgent,
} from "../../../services/printAgent";
import { fetchMainCategories } from "../../../services/categories";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

const PrinterSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("agents");
  const [agents, setAgents] = useState<ConnectedAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean | null>>({});
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryMappings, setCategoryMappings] = useState<Map<string, string>>(new Map());
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [mainCategories, setMainCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [captainOrderEnabled, setCaptainOrderEnabled] = useState(false);
  const [printByAgentEnabled, setPrintByAgentEnabled] = useState(false);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const shopId = localStorage.getItem("shopId") ?? "";
  const companyCode = useMemo(() => {
    try {
      const t = localStorage.getItem("tenant");
      return t ? (JSON.parse(t)?.tenant_code ?? "") : "";
    } catch {
      return "";
    }
  }, []);

  const loadMappings = useCallback(() => {
    setCategoryMappings(getCategoryPrinterMappings());
  }, []);

  const loadMainCategories = useCallback(async () => {
    try {
      const data = await fetchMainCategories();
      setMainCategories(data?.data || data || []);
    } catch {
      console.error("Failed to fetch main categories");
    }
  }, []);

  useEffect(() => {
    loadMappings();
    loadMainCategories();
  }, [loadMappings, loadMainCategories]);

  // Load global printing behavior settings from localStorage
  useEffect(() => {
    const savedCaptainOrder = localStorage.getItem("captain_order_enabled");
    const savedPrintByAgent = localStorage.getItem("print_by_agent_enabled");
    setCaptainOrderEnabled(savedCaptainOrder === "true");
    setPrintByAgentEnabled(savedPrintByAgent === "true");
  }, []);

  const checkStatus = useCallback(async () => {
    if (!shopId || !companyCode) { setError("Shop ID or Company Code not found."); return; }
    setLoading(true);
    setError(null);
    try {
      const { agents: list } = await getConnectedAgents(shopId, companyCode);
      setAgents(list ?? []);
      setLastChecked(new Date());
    } catch {
      setError("Could not reach the print agent API. Make sure the backend is running.");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, companyCode]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleTestPrint = async (agentId: string) => {
    setTestLoading(agentId);
    setTestResult((prev) => ({ ...prev, [agentId]: null }));
    try {
      const assignedCats = getCategoriesForAgent(agentId);
      const categoryName = assignedCats.length > 0 ? assignedCats[0] : "test";
      console.log(`[test print] Using category name: ${categoryName} for agent ${agentId}`);
      const result = await sendPrintJob({
        shop_id: shopId,
        main_category_id: categoryName,
        content_type: "test",
        cut_paper: true,
        priority: "normal",
        lines: [
          { type: "header", text: "TEST PRINT" },
          { type: "footer", text: `Agent: ${agentId}` },
          { type: "footer", text: `Category: ${categoryName}` },
          { type: "footer", text: new Date().toLocaleString("en-KE") },
          { type: "divider", text: "" },
          { type: "footer", text: "Printer is working correctly!" },
        ],
      }, companyCode);
      setTestResult((prev) => ({ ...prev, [agentId]: result.agentsSent > 0 }));
    } catch {
      setTestResult((prev) => ({ ...prev, [agentId]: false }));
    } finally {
      setTestLoading(null);
    }
  };

  const handleAddCategory = (agentId: string) => {
    if (!newCategoryId.trim()) return;
    const cat = mainCategories.find((c) => c._id === newCategoryId);
    const categoryName = cat?.name || newCategoryId;
    setCategoryPrinterMapping(categoryName, agentId);
    loadMappings();
    setNewCategoryId("");
    setEditingAgent(null);
  };

  const handleRemoveCategory = (categoryName: string) => {
    removeCategoryPrinterMapping(categoryName);
    loadMappings();
  };

  const getCategoriesForAgent = (agentId: string): string[] => {
    const result: string[] = [];
    categoryMappings.forEach((aid, catName) => {
      if (aid === agentId) result.push(catName);
    });
    return result;
  };

  const handleToggleCaptainOrder = (checked: boolean) => {
    setCaptainOrderEnabled(checked);
    localStorage.setItem("captain_order_enabled", checked.toString());
    message.success(checked ? "Captain Order Mode enabled" : "Captain Order Mode disabled");
  };

  const handleTogglePrintByAgent = (checked: boolean) => {
    if (checked && agents.length === 0) {
      message.warning("Cannot enable agent printing: No print agents connected. Please install and configure the Print Agent app first.");
      return;
    }
    setPrintByAgentEnabled(checked);
    localStorage.setItem("print_by_agent_enabled", checked.toString());
    message.success(checked ? "Agent-based printing enabled" : "Browser printing enabled");
  };

  const renderSteps = (steps: React.ReactNode[], style?: React.CSSProperties) => (
    <div
      style={{
        textAlign: "left",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: isMobile ? "12px 14px" : "14px 18px",
        ...style,
      }}
    >
      {steps.map((step, i, arr) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: i === arr.length - 1 ? 0 : 12,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              flexShrink: 0,
              background: C.primaryLight,
              color: C.primary,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {i + 1}
          </div>
          <Text style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            {step}
          </Text>
        </div>
      ))}
    </div>
  );

  const idChip = (label: string, value: string) => (
    <Text code copyable={value ? { text: value } : false} style={{ fontSize: 11 }}>
      {label}: {value || "—"}
    </Text>
  );

  const downloadCard = (
    icon: React.ReactNode,
    title: string,
    version: string,
    desc: string,
    href: string,
    btnLabel: string
  ) => (
    <div
      key={title}
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: isMobile ? 12 : 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {icon}
        <Text strong style={{ fontSize: 14 }}>{title}</Text>
        <Tag color="blue" style={{ fontSize: 11 }}>{version}</Tag>
      </div>
      <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 4 }}>
        {desc}
      </Text>
      <div style={{ marginTop: 10 }}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          href={href}
          download
          block
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
        >
          {btnLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "8px 0" : "16px 0" }}>
      <ProCard
        bordered
        tabs={{
          type: "card",
          activeKey: activeTab,
          size: isMobile ? "small" : "large",
          onChange: setActiveTab,
        }}
        bodyStyle={{ padding: isMobile ? "12px 8px" : undefined }}
      >
        {/* ── Connected Agents Tab ───────────────────────────────────────────── */}
        <ProCard.TabPane
          key="agents"
          tab={
            <Space>
              <ApiOutlined style={{ color: C.primary }} />
              <Text>Connected Agents</Text>
            </Space>
          }
        >
          <ProCard
            bordered={!isMobile}
            title={
              <Space>
                <PrinterOutlined style={{ color: C.primary }} />
                <Text strong>{isMobile ? "Connected Printers" : "Print Agent — Connected Printers"}</Text>
              </Space>
            }
            headStyle={{ padding: isMobile ? "10px 12px" : undefined }}
            extra={
              <Space size={8}>
                {!isMobile && lastChecked && (
                  <Text style={{ fontSize: 11, color: C.subText }}>
                    Checked: {lastChecked.toLocaleTimeString("en-KE")}
                  </Text>
                )}
                <Button
                  size="small"
                  icon={<ReloadOutlined spin={loading} />}
                  onClick={checkStatus}
                  loading={loading}
                >
                  {!isMobile && "Refresh"}
                </Button>
              </Space>
            }
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
          >
            {!shopId && (
              <Alert
                type="error"
                showIcon
                message="Shop ID is not set. Please log in again."
                style={{ marginBottom: 12, borderRadius: 8 }}
              />
            )}
            {error && (
              <Alert
                type="warning"
                showIcon
                message={error}
                style={{ marginBottom: 12, borderRadius: 8 }}
              />
            )}

            {loading && agents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Spin />
                <Text style={{ display: "block", marginTop: 8, color: C.subText }}>
                  Checking agent connections…
                </Text>
              </div>
            ) : agents.length === 0 ? (
              error ? null : (
                <div style={{ textAlign: "center", padding: isMobile ? "12px 2px" : "24px 16px" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      margin: "0 auto 12px",
                      background: C.primaryLight,
                      color: C.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    <PrinterOutlined />
                  </div>
                  <Text strong style={{ display: "block", fontSize: 15, color: "#0f172a" }}>
                    No printers connected
                  </Text>
                  <Text style={{ display: "block", fontSize: 13, color: C.subText, marginTop: 4 }}>
                    Install the Print Agent on the computer connected to each printer.
                  </Text>

                  {renderSteps(
                    [
                      <>Download and install the Print Agent on each printer's computer.</>,
                      <>
                        Open it and enter your {idChip("Company Code", companyCode)} and{" "}
                        {idChip("Shop ID", shopId)}, then click Connect.
                      </>,
                      <>
                        The agent appears here automatically — use <strong>Assign Category</strong> to
                        route print jobs (e.g. Kitchen, Bar, Cashier).
                      </>,
                    ],
                    { maxWidth: 440, margin: "16px auto 0" }
                  )}

                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => setActiveTab("download")}
                    style={{ marginTop: 14, borderRadius: 6 }}
                  >
                    Download Print Agent
                  </Button>
                </div>
              )
            ) : (
              <List
                dataSource={agents}
                rowKey="agent_id"
                renderItem={(agent) => {
                  const key = agent.agent_id;
                  const result = testResult[key];
                  const assignedCats = getCategoriesForAgent(key);
                  const actionNodes = [
                    result === true && (
                      <Tag key="sent" color="success" style={{ fontSize: 11 }}>✓ Sent</Tag>
                    ),
                    result === false && (
                      <Tag key="failed" color="error" style={{ fontSize: 11 }}>✗ Failed</Tag>
                    ),
                    <Button
                      key="test-print"
                      size="small"
                      icon={<SendOutlined />}
                      loading={testLoading === key}
                      onClick={() => handleTestPrint(key)}
                      style={{ borderColor: C.primary, color: C.primary, borderRadius: 6 }}
                    >
                      Test Print
                    </Button>,
                  ].filter(Boolean) as React.ReactNode[];
                  return (
                    <List.Item
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 10,
                        padding: isMobile ? "10px 10px" : "10px 14px",
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                      actions={isMobile ? undefined : actionNodes}
                    >
                      <List.Item.Meta
                        avatar={
                          <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18, marginTop: 2 }} />
                        }
                        title={
                          <Space wrap size={6}>
                            <PrinterOutlined style={{ color: C.primary }} />
                            <Text strong style={{ fontSize: 13, wordBreak: "break-all" }}>
                              Agent: {agent.agent_id}
                            </Text>
                            <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>
                              Online
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <Text style={{ fontSize: 12, color: C.subText, wordBreak: "break-all" }}>
                              Shop: {agent.shop_id}
                            </Text>
                            <div style={{ marginTop: 8 }}>
                              <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 4 }}>
                                Assigned Categories:
                              </Text>
                              <Space wrap size={4}>
                                {assignedCats.length === 0 && (
                                  <Tag style={{ fontSize: 10, color: "#9ca3af", border: "1px dashed #d1d5db" }}>
                                    None assigned
                                  </Tag>
                                )}
                                {assignedCats.map((catName) => (
                                  <Tag
                                    key={catName}
                                    closable
                                    onClose={() => handleRemoveCategory(catName)}
                                    closeIcon={<DeleteOutlined style={{ fontSize: 10 }} />}
                                    color="blue"
                                    style={{ borderRadius: 4, fontSize: 10 }}
                                  >
                                    {catName}
                                  </Tag>
                                ))}
                              </Space>
                              <div style={{ marginTop: 6 }}>
                                {editingAgent === key ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                    <Select
                                      size="small"
                                      placeholder="Select main category"
                                      value={newCategoryId || undefined}
                                      onChange={(value) => setNewCategoryId(value)}
                                      style={{ flex: "1 1 180px", minWidth: 140, fontSize: 11 }}
                                      showSearch
                                      optionFilterProp="children"
                                    >
                                      {mainCategories.map((cat) => (
                                        <Select.Option key={cat._id} value={cat._id}>
                                          {cat.name} <span style={{ color: "#9ca3af", fontSize: 10 }}> ({cat._id})</span>
                                        </Select.Option>
                                      ))}
                                    </Select>
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<PlusOutlined />}
                                      onClick={() => handleAddCategory(key)}
                                      disabled={!newCategoryId}
                                      style={{ fontSize: 11 }}
                                    >
                                      Add
                                    </Button>
                                    <Button
                                      size="small"
                                      onClick={() => { setEditingAgent(null); setNewCategoryId(""); }}
                                      style={{ fontSize: 11 }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => { setEditingAgent(key); setNewCategoryId(""); }}
                                    style={{ fontSize: 11 }}
                                  >
                                    Assign Category
                                  </Button>
                                )}
                              </div>
                            </div>
                            {isMobile && (
                              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                {actionNodes}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </ProCard>
        </ProCard.TabPane>

        {/* ── Download Agent Tab ─────────────────────────────────────────────── */}
        <ProCard.TabPane
          key="download"
          tab={
            <Space>
              <DownloadOutlined style={{ color: C.primary }} />
              <Text>Download Agent</Text>
            </Space>
          }
        >
          <ProCard
            bordered={!isMobile}
            title={
              <Space>
                <DownloadOutlined style={{ color: C.primary }} />
                <Text strong>Download BASE Print Agent</Text>
              </Space>
            }
            headStyle={{ padding: isMobile ? "10px 12px" : undefined }}
            bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              {downloadCard(
                <AppleOutlined style={{ fontSize: 20, color: C.primary }} />,
                "macOS (Apple Silicon)",
                "v0.4.2",
                "For Mac computers with Apple Silicon (M1, M2, M3 chips)",
                "https://reliatechdocs.nyc3.digitaloceanspaces.com/Print%20Agents/PrintAgent_0.4.2_aarch64.dmg",
                "Download for macOS"
              )}
              {downloadCard(
                <WindowsOutlined style={{ fontSize: 20, color: C.primary }} />,
                "Windows (64-bit)",
                "v0.6.2",
                "For Windows 10/11 computers (64-bit)",
                "https://reliatechdocs.nyc3.digitaloceanspaces.com/Print%20Agents/PrintAgent_0.6.2_x64-setup.exe",
                "Download for Windows"
              )}
            </div>

            {renderSteps(
              [
                <>Download and run the installer for your operating system above.</>,
                <>
                  Launch the Print Agent, then enter your {idChip("Company Code", companyCode)} and{" "}
                  {idChip("Shop ID", shopId)} and click Connect.
                </>,
                <>
                  The agent will appear in the <strong>Connected Agents</strong> tab — assign
                  categories to each printer agent to route print jobs.
                </>,
              ],
              { marginTop: 16 }
            )}
          </ProCard>
        </ProCard.TabPane>

        {/* ── Printing Controls Tab ─────────────────────────────────────────────── */}
        <ProCard.TabPane
          key="controls"
          tab={
            <Space>
              <SettingOutlined style={{ color: C.primary }} />
              <Text>Printing Controls</Text>
            </Space>
          }
        >
          <ProCard
            bordered={!isMobile}
            title={
              <Space>
                <PrinterOutlined style={{ color: C.primary }} />
                <Text strong>{isMobile ? "Printing Behavior" : "Global Printing Behavior Settings"}</Text>
              </Space>
            }
            headStyle={{ padding: isMobile ? "10px 12px" : undefined }}
            bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
          >
            {/* Global Settings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Captain Order Mode */}
              <div style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: isMobile ? "12px" : "16px 18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                      🧑‍✈️ Captain Order Mode
                    </Text>
                    <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                      When enabled, shows the Send button in cart drawer for sending orders to kitchen
                    </Text>
                  </div>
                  <Switch
                    checked={captainOrderEnabled}
                    onChange={handleToggleCaptainOrder}
                    style={{ minWidth: 48 }}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </div>

              {/* Agent-Based Printing */}
              <div style={{
                background: "#fff",
                border: agents.length === 0 ? "1px dashed #f59e0b" : "1px solid #e2e8f0",
                borderRadius: 8,
                padding: isMobile ? "12px" : "16px 18px",
                opacity: agents.length === 0 ? 0.7 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                      🖨️ Print Method
                    </Text>
                    <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                      {printByAgentEnabled ? "Print via API (Agent)" : "Print via Browser (Default)"}
                    </Text>
                    {agents.length === 0 && (
                      <Text style={{ fontSize: 12, color: "#f59e0b", display: "block", marginTop: 6 }}>
                        ⚠️ No agents connected - agent printing unavailable
                      </Text>
                    )}
                  </div>
                  <Switch
                    checked={printByAgentEnabled}
                    onChange={handleTogglePrintByAgent}
                    disabled={agents.length === 0}
                    style={{ minWidth: 48 }}
                    checkedChildren="API"
                    unCheckedChildren="Browser"
                  />
                </div>
              </div>
            </div>
          </ProCard>
        </ProCard.TabPane>
      </ProCard>
    </div>
  );
};

export default PrinterSettings;
