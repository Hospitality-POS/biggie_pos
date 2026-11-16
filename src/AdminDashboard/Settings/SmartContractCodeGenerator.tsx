import React from "react";
import {
  Typography,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Row,
  Col,
  Alert,
  Segmented,
  Descriptions,
  message,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import { ThunderboltOutlined, CheckOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  generateContractCode,
  formatMoney,
  formatPaidUntil,
  ContractStatus,
  GeneratedCode,
} from "@services/smartContract";

const { Text, Paragraph } = Typography;

type GeneratorAction = "activate" | "reactivate" | "extend" | "disable";

type GeneratorValues = {
  pin: string;
  tenant: string;
  install: string;
  fee?: number;
  start?: Dayjs;
  // Activate: when the first payment falls due (optional)
  activate_paid_until?: Dayjs;
  // Extend: days from today
  days?: number;
  paid_until?: Dayjs;
  current_paid_until?: Dayjs;
  note?: string;
};

interface Props {
  status: ContractStatus;
  // Fills the activate / reactivate form on this page with a generated code
  onUse: (generated: GeneratedCode) => void;
}

// BasePoint staff only. Shown when this server has BasePoint's signing key
// and a staff PIN configured — never on a client install.
const SmartContractCodeGenerator: React.FC<Props> = ({ status, onUse }) => {
  const [form] = Form.useForm<GeneratorValues>();
  const [action, setAction] = React.useState<GeneratorAction>(status.enabled ? "reactivate" : "activate");
  const [result, setResult] = React.useState<GeneratedCode | null>(null);
  const [showFullCode, setShowFullCode] = React.useState(false);
  const tenant: string = Form.useWatch("tenant", form) || "";
  const install: string = Form.useWatch("install", form) || "";
  const isThisInstall = tenant.trim() === status.tenant_code && install.trim().toUpperCase() === status.install_id;
  const days: number | undefined = Form.useWatch("days", form);
  const extendUntil = days && days > 0 ? dayjs().add(days, "day") : null;

  React.useEffect(() => {
    form.setFieldsValue({
      tenant: status.tenant_code,
      install: status.install_id,
      fee: status.monthly_fee ?? undefined,
      start: dayjs(),
      days: 5,
      paid_until: status.next_period_paid_until ? dayjs(status.next_period_paid_until.slice(0, 10)) : undefined,
      current_paid_until: status.paid_until ? dayjs(status.paid_until.slice(0, 10)) : undefined,
    });
  }, [form, status.tenant_code, status.install_id, status.monthly_fee, status.next_period_paid_until, status.paid_until]);

  const mutation = useMutation({
    mutationFn: generateContractCode,
    onSuccess: (generated) => {
      setResult(generated);
      message.success("Code generated");
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // 403 (wrong PIN) is already shown by the request interceptor
      if (error?.response?.status !== 403) {
        message.error(error?.response?.data?.message || "Could not generate the code");
      }
    },
  });

  const handleGenerate = async () => {
    const v = await form.validateFields();
    setResult(null);
    setShowFullCode(false);
    const targetDate =
      action === "activate"
        ? v.activate_paid_until
        : action === "reactivate"
          ? v.paid_until
          : action === "disable"
            ? v.current_paid_until
            : undefined;
    mutation.mutate({
      pin: v.pin,
      action,
      tenant_code: v.tenant.trim(),
      install: v.install.trim().toUpperCase(),
      fee: action === "disable" || action === "extend" ? undefined : v.fee,
      start: action === "activate" ? v.start?.format("YYYY-MM-DD") : undefined,
      paid_until: targetDate?.format("YYYY-MM-DD"),
      days: action === "extend" ? v.days : undefined,
      note: v.note || undefined,
    });
  };

  return (
    <ProCard bordered title="Generate code" extra={<Text type="secondary" style={{ fontSize: 12 }}>BasePoint staff</Text>} style={{ marginBottom: 16 }}>
      <Segmented
        block
        value={action}
        onChange={(v) => {
          setAction(v as GeneratorAction);
          setResult(null);
        }}
        options={[
          { label: "Activate", value: "activate" },
          { label: "Reactivate", value: "reactivate" },
          { label: "Extend", value: "extend" },
          { label: "Disable", value: "disable" },
        ]}
        style={{ marginBottom: 12 }}
      />
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
        {action === "activate"
          ? "First activation uses the full code, once. Every code after that is 6 digits."
          : action === "reactivate"
            ? "6-digit code for the next period (up to 3 periods ahead). The install keeps its current fee; to change the fee, use Activate."
            : action === "extend"
              ? "6-digit code giving extra days from today, e.g. 5 days while a payment clears. The fee is unchanged."
              : "6-digit code that turns the smart contract off."}
      </Text>

      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="tenant" label="Tenant code" style={{ marginBottom: 12 }} rules={[{ required: true, message: "Tenant code" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="install"
              label="Install ID"
              style={{ marginBottom: 12 }}
              rules={[
                { required: true, message: "Install ID" },
                { pattern: /^INS-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}$/, message: "INS-XXXXXX-XXXXXX-XXXXXX" },
              ]}
            >
              <Input style={{ fontFamily: "monospace" }} />
            </Form.Item>
          </Col>
          {action !== "disable" && action !== "extend" && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="fee"
                label={action === "reactivate" ? `Client's current monthly fee (${status.currency})` : `Monthly fee (${status.currency})`}
                tooltip={action === "reactivate" ? "Must match the fee on the install. To change the fee, use Activate." : undefined}
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: "Monthly fee" }]}
              >
                <InputNumber<number>
                  min={1}
                  step={500}
                  style={{ width: "100%" }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
          )}
          {action === "activate" && (
            <>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="start"
                  label="Activation date"
                  tooltip="When the service started. Can be in the past, e.g. last month."
                  style={{ marginBottom: 12 }}
                  rules={[{ required: true, message: "Activation date" }]}
                >
                  <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="activate_paid_until"
                  label="Paid until (optional)"
                  tooltip="When the first payment falls due. Leave empty for the 5th of the month after the activation date."
                  style={{ marginBottom: 12 }}
                >
                  <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} placeholder="5th of next month" />
                </Form.Item>
              </Col>
            </>
          )}
          {action === "extend" && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="days"
                label="Days from today"
                extra={extendUntil ? `Access until ${extendUntil.format("DD MMM YYYY")}` : undefined}
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: "Days" }]}
              >
                <InputNumber<number> min={1} max={90} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          )}
          {action === "reactivate" && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="paid_until"
                label="New paid-until date"
                tooltip="The install's 'After reactivation' date, or up to 3 periods later."
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: "New paid-until date" }]}
              >
                <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          )}
          {action === "disable" && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="current_paid_until"
                label="Current paid-until date"
                tooltip="The 'Paid until' date shown on the install."
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: "Current paid-until date" }]}
              >
                <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item name="pin" label="BasePoint PIN" style={{ marginBottom: 12 }} rules={[{ required: true, message: "PIN" }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="note" label="Note (optional)" style={{ marginBottom: 12 }}>
              <Input maxLength={200} placeholder="e.g. M-Pesa QJK2…" />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Button type="primary" icon={<ThunderboltOutlined />} loading={mutation.isPending} onClick={handleGenerate}>
        Generate code
      </Button>

      {result && (
        <div style={{ marginTop: 16 }}>
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 12 }}>
            {result.short_code && (
              <Descriptions.Item label="6-digit code">
                <Paragraph copyable={{ text: result.short_code }} style={{ margin: 0, fontFamily: "monospace", fontSize: 24, letterSpacing: 4 }}>
                  {result.short_code.slice(0, 3)} {result.short_code.slice(3)}
                </Paragraph>
              </Descriptions.Item>
            )}
            {result.monthly_fee != null && (
              <Descriptions.Item label="Monthly fee">{formatMoney(result.monthly_fee, result.currency || status.currency)}</Descriptions.Item>
            )}
            {result.activation_date && <Descriptions.Item label="Activation date">{formatPaidUntil(result.activation_date)}</Descriptions.Item>}
            {result.paid_until && (
              <Descriptions.Item label={result.action === "extend" ? "Extend until" : "Paid until"}>
                {formatPaidUntil(result.paid_until)}
              </Descriptions.Item>
            )}
          </Descriptions>
          {result.action === "extend" && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`On the install: choose Extend, set "Extend until" to ${formatPaidUntil(result.paid_until)} and type the code.`}
            />
          )}
          {result.short_code && !showFullCode ? (
            <Button type="link" size="small" style={{ padding: 0, marginBottom: 12 }} onClick={() => setShowFullCode(true)}>
              Show full code (for installs activated before 6-digit codes)
            </Button>
          ) : (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>Full code</Text>
              <Paragraph copyable code style={{ wordBreak: "break-all", fontSize: 11, marginBottom: 12 }}>
                {result.code}
              </Paragraph>
            </>
          )}
          {isThisInstall ? (
            <Button icon={<CheckOutlined />} onClick={() => onUse(result)}>
              Use on this install
            </Button>
          ) : (
            <Alert type="info" showIcon message="Send this code to the technician at the client's site." />
          )}
        </div>
      )}
    </ProCard>
  );
};

export default SmartContractCodeGenerator;
