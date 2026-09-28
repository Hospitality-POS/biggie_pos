import React from "react";
import { Switch, Typography, Space, Form, Select, Input, InputNumber, Button, message, Row, Col, Card, Alert, Tag } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { ScanOutlined, IdcardOutlined, ClockCircleOutlined, SaveOutlined, ApiOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { testBiometricConnection } from "../../../services/hr/leave";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const BIOMETRIC_PROVIDERS = [
  { value: "zkteco", label: "ZKTeco" },
  { value: "suprema", label: "Suprema" },
  { value: "anviz", label: "Anviz" },
  { value: "hikvision", label: "Hikvision" },
  { value: "other", label: "Other" },
];

const AccessSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);

  const { data: savedData, isFetching } = useQuery({
    queryKey: ["systemSetup"],
    queryFn: () => fetchSystemSetupDetailsById(),
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    form.setFieldsValue(savedData?.access_settings?.biometrics || {});
  }, [form, savedData]);

  const updateMutation = useMutation({
    mutationFn: (params: any) => updateSystemSetup(params as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSetup"] });
      message.success("Biometric settings saved");
    },
    onError: () => {
      message.error("Failed to save settings");
    },
  });

  const handleSave = async () => {
    const biometrics = await form.validateFields();
    await updateMutation.mutateAsync({
      _id: savedData?._id,
      data: { access_settings: { biometrics } },
    });
  };

  return (
    <Card style={{ maxWidth: 1500, margin: "0 auto", borderRadius: 8 }} styles={{ body: { padding: 24 } }}>
      <Row gutter={24}>
        {/* Left — device configuration form */}
        <Col xs={24} lg={14}>
      <ProCard bordered title="Biometric Device Configuration" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
          <ScanOutlined style={{ color: C.primary, marginRight: 6 }} />
          Configure the client's fingerprint / facial-recognition terminal — connection
          details are saved per site and used for attendance sync and access control.
        </Text>

        <Form form={form} layout="vertical" initialValues={{ enabled: false, connection_mode: "polling", sync_interval_minutes: 15 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="provider" label="Device Provider" style={{ marginBottom: 12 }}>
                <Select allowClear placeholder="Select provider" options={BIOMETRIC_PROVIDERS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="connection_mode" label="Connection Mode" style={{ marginBottom: 12 }}>
                <Select
                  options={[
                    { value: "polling", label: "Polling — we pull attendance logs from the device" },
                    { value: "push", label: "Push — device sends punches to this server" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="host" label="Device Host / IP" style={{ marginBottom: 12 }}>
                <Input placeholder="e.g. 192.168.1.201" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="port" label="Port" style={{ marginBottom: 12 }}>
                <InputNumber min={1} max={65535} placeholder="4370" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="sync_interval_minutes" label="Sync every (min)" style={{ marginBottom: 12 }}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="comm_key" label="Comm Key / Password" style={{ marginBottom: 12 }}>
                <Input.Password placeholder="Device communication key" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="device_serial" label="Device Serial" style={{ marginBottom: 12 }}>
                <Input placeholder="Optional — for multi-device sites" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="enabled" label="Enable Biometric Sync" valuePropName="checked" style={{ marginBottom: 12 }}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Space wrap>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={updateMutation.isPending || isFetching}
            disabled={!savedData?._id}
            onClick={handleSave}
          >
            Save Biometric Settings
          </Button>
          <Button
            icon={<ApiOutlined />}
            loading={testing}
            onClick={async () => {
              // Save first so the probe uses the latest host/port
              await handleSave().catch(() => undefined);
              setTesting(true);
              try {
                setTestResult(await testBiometricConnection());
              } finally {
                setTesting(false);
              }
            }}
          >
            Test Connection
          </Button>
        </Space>

        {testResult && (
          <Alert
            style={{ marginTop: 14 }}
            type={testResult.reachable ? "success" : "warning"}
            showIcon
            message={
              <Space size={8} wrap>
                {testResult.reachable ? "Device connected" : testResult.configured === false ? "Not configured" : "Device unreachable"}
                {testResult.provider && <Tag style={{ margin: 0 }}>{testResult.provider}</Tag>}
                {testResult.latency_ms != null && (
                  <Text type="secondary" style={{ fontSize: 11 }}>{testResult.latency_ms}ms</Text>
                )}
              </Space>
            }
            description={testResult.message}
          />
        )}

        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 14 }}>
          Punches from the device land in <Text strong style={{ fontSize: 11 }}>HR → Attendance</Text> via
          {" "}<Text code style={{ fontSize: 11 }}>POST /hr/attendance/biometric/punch</Text> —
          map each device user to a staff member's biometric PIN (or employee number).
        </Text>
      </ProCard>
        </Col>

        {/* Right — capability summary */}
        <Col xs={24} lg={10}>
      <ProCard bordered title="What biometrics unlocks" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {[
            {
              icon: <IdcardOutlined style={{ color: C.primary }} />,
              title: "Biometric devices",
              desc: "Connect fingerprint and face-recognition terminals (ZKTeco, Suprema, Anviz) to employee records.",
            },
            {
              icon: <ClockCircleOutlined style={{ color: C.primary }} />,
              title: "Attendance sync",
              desc: "Punches feed straight into HR attendance — no manual timesheets.",
            },
            {
              icon: <ScanOutlined style={{ color: C.primary }} />,
              title: "Access control",
              desc: "Restrict till and back-office access by employee biometric profile.",
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

export default AccessSettings;
