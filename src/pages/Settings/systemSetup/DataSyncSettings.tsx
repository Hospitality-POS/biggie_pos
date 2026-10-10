import React from "react";
import {
  Switch,
  Typography,
  Space,
  Form,
  Select,
  Input,
  Button,
  message,
  Row,
  Col,
  Card,
  Alert,
  Tag,
  Popconfirm,
  Table,
  Checkbox,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  CloudSyncOutlined,
  SaveOutlined,
  ApiOutlined,
  SyncOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TimePicker } from "antd";
import dayjs from "dayjs";
import {
  fetchSyncConfig,
  updateSyncConfig,
  testSyncConnection,
  fetchSyncStatus,
  runSyncNow,
  SyncRunResponse,
} from "../../../services/sync";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const FALLBACK_TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Dar_es_Salaam",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Addis_Ababa",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "UTC",
];

const TIMEZONES: string[] =
  (Intl as any).supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES;

const STATUS_COLOR: Record<string, string> = {
  ok: "green",
  partial: "orange",
  error: "red",
};

const DataSyncSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);
  const [runResult, setRunResult] = React.useState<SyncRunResponse | null>(null);
  const [fullSync, setFullSync] = React.useState(false);
  const [removeMissing, setRemoveMissing] = React.useState(false);

  const { data: configData, isFetching } = useQuery({
    queryKey: ["syncConfig"],
    queryFn: fetchSyncConfig,
    refetchOnWindowFocus: false,
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ["syncStatus"],
    queryFn: fetchSyncStatus,
    refetchOnWindowFocus: false,
  });

  const config = configData?.config;

  React.useEffect(() => {
    if (!config) return;
    form.setFieldsValue({
      enabled: config.enabled,
      mongo_uri: config.mongo_uri || undefined,
      sync_time: config.sync_time ? dayjs(config.sync_time, "HH:mm") : undefined,
      timezone: config.timezone,
      collections: config.collections || [],
      remove_missing: config.remove_missing,
    });
  }, [form, config]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => updateSyncConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syncConfig"] });
      message.success("Sync settings saved");
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to save sync settings");
    },
  });

  const runMutation = useMutation({
    mutationFn: (opts: { full?: boolean; removeMissing?: boolean }) => runSyncNow(opts),
    onSuccess: (result) => {
      setRunResult(result);
      const hasErrors = result.results?.some((r) => r.status === "error");
      if (hasErrors) {
        message.warning("Sync finished with errors — see details below");
      } else {
        message.success(`Sync complete — ${result.documentsSynced} documents synced`);
      }
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["syncConfig"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Sync failed to start");
    },
  });

  const buildPayload = async () => {
    const values = await form.validateFields();
    return {
      enabled: !!values.enabled,
      mongo_uri: values.mongo_uri || null,
      sync_time: values.sync_time ? values.sync_time.format("HH:mm") : "07:00",
      timezone: values.timezone || "Africa/Nairobi",
      collections: values.collections || [],
      remove_missing: !!values.remove_missing,
    };
  };

  const handleSave = async () => {
    const payload = await buildPayload();
    await saveMutation.mutateAsync(payload);
    return payload;
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { mongo_uri } = await form.validateFields(["mongo_uri"]);
      const result = await testSyncConnection(mongo_uri || undefined);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        ok: false,
        message: error?.response?.data?.error || error?.response?.data?.message || "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const collectionOptions = (configData?.validCollections || []).map((key) => ({
    value: key,
    label: key.replace(/_/g, " "),
  }));

  const statusColumns = [
    {
      title: "Collection",
      dataIndex: "key",
      key: "key",
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v.replace(/_/g, " ")}</Text>,
    },
    {
      title: "Last synced",
      dataIndex: "lastSyncedAt",
      key: "lastSyncedAt",
      render: (v: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v ? dayjs(v).format("DD MMM YYYY, HH:mm") : "—"}
        </Text>
      ),
    },
    {
      title: "Docs last run",
      dataIndex: "lastSyncCount",
      key: "lastSyncCount",
      align: "right" as const,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{v ?? 0}</Text>,
    },
  ];

  return (
    <Card style={{ maxWidth: 1500, margin: "0 auto", borderRadius: 8 }} styles={{ body: { padding: 24 } }}>
      <Row gutter={24}>
        {/* Left — configuration form */}
        <Col xs={24} lg={14}>
          <ProCard bordered title="Secondary Database Sync" style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
              <CloudSyncOutlined style={{ color: C.primary, marginRight: 6 }} />
              Mirror your POS data to a secondary MongoDB database for reporting and backup.
              Sync runs automatically at the scheduled time and can also be triggered manually.
            </Text>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                enabled: false,
                sync_time: dayjs("07:00", "HH:mm"),
                timezone: "Africa/Nairobi",
                collections: [],
                remove_missing: false,
              }}
            >
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    name="mongo_uri"
                    label="Secondary Database URI"
                    tooltip="MongoDB connection string. Use {db_name} where the database name should go — if omitted, it is appended automatically."
                    style={{ marginBottom: 12 }}
                    rules={[
                      {
                        pattern: /^mongodb(\+srv)?:\/\//,
                        message: "Must be a mongodb:// or mongodb+srv:// URI",
                      },
                    ]}
                  >
                    <Input.Password
                      placeholder="mongodb+srv://user:pass@cluster.mongodb.net/{db_name}"
                      autoComplete="off"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="sync_time"
                    label="Daily Sync Time"
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: "Pick a time" }]}
                  >
                    <TimePicker format="HH:mm" style={{ width: "100%" }} minuteStep={5} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="timezone" label="Timezone" style={{ marginBottom: 12 }}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="collections"
                    label="Collections to Sync"
                    tooltip="Leave empty to sync everything"
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="All collections"
                      options={collectionOptions}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="enabled"
                    label="Enable Scheduled Sync"
                    valuePropName="checked"
                    style={{ marginBottom: 12 }}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="remove_missing"
                    label="Delete Removed Records"
                    tooltip="On full syncs, delete records on the secondary DB that no longer exist here"
                    valuePropName="checked"
                    style={{ marginBottom: 12 }}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Space wrap>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveMutation.isPending || isFetching}
                onClick={handleSave}
              >
                Save Sync Settings
              </Button>
              <Button icon={<ApiOutlined />} loading={testing} onClick={handleTest}>
                Test Connection
              </Button>
              <Popconfirm
                title="Run sync now?"
                description={
                  <Space direction="vertical" size={4} style={{ maxWidth: 280 }}>
                    <Checkbox checked={fullSync} onChange={(e) => setFullSync(e.target.checked)}>
                      Full re-sync (ignore previous progress)
                    </Checkbox>
                    <Checkbox
                      checked={removeMissing}
                      disabled={!fullSync}
                      onChange={(e) => setRemoveMissing(e.target.checked)}
                    >
                      Delete removed records (full sync only)
                    </Checkbox>
                  </Space>
                }
                onConfirm={() => runMutation.mutate({ full: fullSync, removeMissing })}
                okText="Run Sync"
              >
                <Button icon={<SyncOutlined />} loading={runMutation.isPending}>
                  Sync Now
                </Button>
              </Popconfirm>
            </Space>

            {testResult && (
              <Alert
                style={{ marginTop: 14 }}
                type={testResult.ok ? "success" : "error"}
                showIcon
                message={
                  <Space size={8} wrap>
                    {testResult.ok ? "Connection successful" : "Connection failed"}
                    {testResult.latencyMs != null && (
                      <Text type="secondary" style={{ fontSize: 11 }}>{testResult.latencyMs}ms</Text>
                    )}
                  </Space>
                }
                description={testResult.ok ? `Connected to "${testResult.database}"` : testResult.message}
              />
            )}

            {runResult && (
              <Alert
                style={{ marginTop: 14 }}
                type={runResult.results?.some((r) => r.status === "error") ? "warning" : "success"}
                showIcon
                message={`${runResult.message} — ${runResult.documentsSynced} documents synced (${runResult.mode})`}
                description={
                  runResult.results?.some((r) => r.status === "error")
                    ? runResult.results
                        .filter((r) => r.status === "error")
                        .map((r) => `${r.key}: ${r.error}`)
                        .join(" · ")
                    : undefined
                }
                closable
                onClose={() => setRunResult(null)}
              />
            )}
          </ProCard>
        </Col>

        {/* Right — status & summary */}
        <Col xs={24} lg={10}>
          <ProCard bordered title="Sync Status" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <ClockCircleOutlined style={{ color: C.primary, fontSize: 16, paddingTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 13, display: "block" }}>Schedule</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {config?.enabled
                      ? `Daily at ${config.sync_time} (${config.timezone})`
                      : "Disabled — enable scheduled sync above"}
                  </Text>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <CheckCircleOutlined style={{ color: C.primary, fontSize: 16, paddingTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    Last run{" "}
                    {config?.last_run_status && (
                      <Tag color={STATUS_COLOR[config.last_run_status] || "default"} style={{ marginLeft: 4 }}>
                        {config.last_run_status}
                      </Tag>
                    )}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {config?.last_run_at
                      ? `${dayjs(config.last_run_at).format("DD MMM YYYY, HH:mm")} — ${config.last_run_summary?.documentsSynced ?? 0} documents`
                      : "Never run"}
                  </Text>
                </div>
              </div>
            </Space>

            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey="key"
              columns={statusColumns}
              dataSource={statusData?.collections || []}
              pagination={false}
              locale={{ emptyText: "No sync history yet" }}
            />
          </ProCard>

          <ProCard bordered title="What gets synced" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              {[
                {
                  icon: <DatabaseOutlined style={{ color: C.primary }} />,
                  title: "Sales & payments",
                  desc: "Orders, order items and order payments.",
                },
                {
                  icon: <DatabaseOutlined style={{ color: C.primary }} />,
                  title: "Catalogue & stock",
                  desc: "Products, product inventory, inventory usage and UOMs.",
                },
                {
                  icon: <DatabaseOutlined style={{ color: C.primary }} />,
                  title: "Purchasing",
                  desc: "Purchase orders, purchase order items, deliveries and delivery items.",
                },
                {
                  icon: <DatabaseOutlined style={{ color: C.primary }} />,
                  title: "Crew",
                  desc: "User accounts — passwords and PINs are never copied.",
                },
              ].map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 16, paddingTop: 2 }}>{f.icon}</div>
                  <div>
                    <Text strong style={{ fontSize: 13, display: "block" }}>{f.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{f.desc}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </ProCard>
        </Col>
      </Row>
    </Card>
  );
};

export default DataSyncSettings;
