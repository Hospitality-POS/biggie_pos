import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, Button, List, Select, Space, Spin, Tag, Typography, Divider, Switch, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PrinterOutlined, ReloadOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
  DownloadOutlined, AppleOutlined, WindowsOutlined, SettingOutlined,
} from "@ant-design/icons";
import {
  getConnectedAgents, sendPrintJob,
  getCategoryPrinterMappings, setCategoryPrinterMapping, removeCategoryPrinterMapping,
  type ConnectedAgent,
} from "../../../services/printAgent";
import { fetchMainCategories } from "../../../services/categories";

const { Text } = Typography;

const C = { primary: "#6c1c2c", subText: "#64748b" };

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

  return (
    <div style={{ padding: "16px 0" }}>
      <ProCard
        bordered
        tabs={{
          type: "card",
          activeKey: activeTab,
          size: "large",
          onChange: setActiveTab,
        }}
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
            bordered
            title={
              <Space>
                <PrinterOutlined style={{ color: C.primary }} />
                <Text strong>Print Agent — Connected Printers</Text>
              </Space>
            }
            extra={
              <Space>
                {lastChecked && (
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
                  Refresh
                </Button>
              </Space>
            }
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: "14px 16px" }}
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
              <Alert
                type="info"
                showIcon
                message="No agents connected"
                description="Install the PrintAgent app and configure it with your shop_id."
                style={{ borderRadius: 8 }}
              />
            ) : (
              <List
                dataSource={agents}
                rowKey="agent_id"
                renderItem={(agent) => {
                  const key = agent.agent_id;
                  const result = testResult[key];
                  const assignedCats = getCategoriesForAgent(key);
                  return (
                    <List.Item
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 10,
                        padding: "10px 14px",
                        marginBottom: 8,
                      }}
                      actions={[
                        result === true && (
                          <Tag color="success" style={{ fontSize: 11 }}>✓ Sent</Tag>
                        ),
                        result === false && (
                          <Tag color="error" style={{ fontSize: 11 }}>✗ Failed</Tag>
                        ),
                        <Button
                          size="small"
                          icon={<SendOutlined />}
                          loading={testLoading === key}
                          onClick={() => handleTestPrint(key)}
                          style={{ borderColor: C.primary, color: C.primary, borderRadius: 6 }}
                        >
                          Test Print
                        </Button>,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={
                          <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18, marginTop: 2 }} />
                        }
                        title={
                          <Space>
                            <PrinterOutlined style={{ color: C.primary }} />
                            <Text strong style={{ fontSize: 13 }}>
                              Agent: {agent.agent_id}
                            </Text>
                            <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>
                              Online
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <Text style={{ fontSize: 12, color: C.subText }}>
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
                                  <Space size={4}>
                                    <Select
                                      size="small"
                                      placeholder="Select main category"
                                      value={newCategoryId || undefined}
                                      onChange={(value) => setNewCategoryId(value)}
                                      style={{ width: 220, fontSize: 11 }}
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
                                  </Space>
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
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </ProCard>

          {!loading && agents.length === 0 && !error && (
            <ProCard
              bordered
              title={
                <Space>
                  <CloseCircleOutlined style={{ color: "#dc2626" }} />
                  <Text strong>No Printers Online</Text>
                </Space>
              }
              bodyStyle={{ padding: "14px 16px" }}
            >
              <Alert
                type="info"
                showIcon
                message="How to connect a printer agent"
                description={
                  <ol style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12 }}>
                    <li>Install the PrintAgent app on the machine connected to each printer.</li>
                    <li>
                      Set the agent's <strong>shop_id</strong> to{" "}
                      <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3 }}>
                        {shopId || "<your shop id>"}
                      </code>
                      .
                    </li>
                    <li>
                      Start the agent — it will appear here automatically.
                    </li>
                    <li>
                      Use the <strong>"Assign Category"</strong> button to assign each connected agent
                      to a main category (e.g. Kitchen, Bar, Cashier). Enter the main category ObjectId.
                    </li>
                    <li>
                      When printing, items are routed to the agent assigned to their main category.
                    </li>
                  </ol>
                }
              />
            </ProCard>
          )}
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
            bordered
            title={
              <Space>
                <DownloadOutlined style={{ color: C.primary }} />
                <Text strong>Download BASE Print Agent</Text>
              </Space>
            }
            bodyStyle={{ padding: "14px 16px" }}
          >
            <Alert
              type="info"
              showIcon
              message="Install the Print Agent on your computer to connect printers"
              description="Download and install the appropriate version for your operating system, then configure it with your shop ID."
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {/* macOS Download */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 16,
              }}>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Space>
                    <AppleOutlined style={{ fontSize: 20, color: "#6c1c2c" }} />
                    <Text strong style={{ fontSize: 14 }}>macOS (Apple Silicon)</Text>
                    <Tag color="blue" style={{ fontSize: 11 }}>v0.4.2</Tag>
                  </Space>
                  <Text style={{ fontSize: 12, color: C.subText }}>
                    For Mac computers with Apple Silicon (M1, M2, M3 chips)
                  </Text>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href="https://reliatechdocs.nyc3.digitaloceanspaces.com/Print%20Agents/PrintAgent_0.4.2_aarch64.dmg"
                    download
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
                  >
                    Download for macOS
                  </Button>
                </Space>
              </div>

              {/* Windows Download */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 16,
              }}>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Space>
                    <WindowsOutlined style={{ fontSize: 20, color: "#6c1c2c" }} />
                    <Text strong style={{ fontSize: 14 }}>Windows (64-bit)</Text>
                    <Tag color="blue" style={{ fontSize: 11 }}>v0.6.2</Tag>
                  </Space>
                  <Text style={{ fontSize: 12, color: C.subText }}>
                    For Windows 10/11 computers (64-bit)
                  </Text>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href="https://reliatechdocs.nyc3.digitaloceanspaces.com/Print%20Agents/PrintAgent_0.6.2_x64-setup.exe"
                    download
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
                  >
                    Download for Windows
                  </Button>
                </Space>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              {/* Installation Instructions */}
              <div>
                <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                  Installation Instructions:
                </Text>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: C.subText, lineHeight: 1.8 }}>
                  <li>Download the appropriate installer for your operating system above</li>
                  <li>Run the installer and follow the setup wizard</li>
                  <li>Launch the Print Agent application after installation</li>
                  <li>Enter your <strong>Company Code</strong>: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 3 }}>{companyCode || "<your company code>"}</code></li>
                  <li>Enter your <strong>Shop ID</strong>: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 3 }}>{shopId || "<your shop id>"}</code></li>
                  <li>Click "Connect" - the agent will appear in the Connected Agents tab</li>
                  <li>Assign categories to each printer agent to route print jobs correctly</li>
                </ol>
              </div>
            </Space>
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
            bordered
            title={
              <Space>
                <PrinterOutlined style={{ color: C.primary }} />
                <Text strong>Global Printing Behavior Settings</Text>
              </Space>
            }
            bodyStyle={{ padding: "14px 16px" }}
          >
            {/* Global Settings */}
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {/* Captain Order Mode */}
              <div style={{ 
                background: "#fff", 
                border: "1px solid #e2e8f0", 
                borderRadius: 8, 
                padding: "16px 18px" 
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
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
                    style={{ minWidth: 48, marginLeft: 16 }}
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
                padding: "16px 18px",
                opacity: agents.length === 0 ? 0.7 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
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
                    style={{ minWidth: 48, marginLeft: 16 }}
                    checkedChildren="API"
                    unCheckedChildren="Browser"
                  />
                </div>
              </div>
            </Space>
          </ProCard>
        </ProCard.TabPane>
      </ProCard>
    </div>
  );
};

export default PrinterSettings;
