import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, Button, List, Select, Space, Spin, Tag, Typography } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PrinterOutlined, ReloadOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
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

  return (
    <div style={{ padding: "16px 0" }}>
      <ProCard
        bordered
        title={
          <Space>
            <ApiOutlined style={{ color: C.primary }} />
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
    </div>
  );
};

export default PrinterSettings;
