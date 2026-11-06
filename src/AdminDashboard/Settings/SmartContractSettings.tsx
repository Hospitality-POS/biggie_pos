import React from "react";
import {
  Typography,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Segmented,
  Button,
  message,
  Row,
  Col,
  Card,
  Alert,
  Tag,
  Table,
  Descriptions,
  Empty,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import { SafetyCertificateOutlined, KeyOutlined, ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  activateContract,
  unlockContractWithPin,
  fetchContractStatus,
  formatMoney,
  formatPaidUntil,
  paymentDetailProps,
  historyDateOf,
  isDigitCode,
  CONTRACT_STATUS_KEY,
  ContractActivation,
  ContractState,
  ContractStatus,
  GeneratedCode,
} from "@services/smartContract";
import { THEME_C } from "@utils/getPrimaryColor";
import SmartContractCodeGenerator from "./SmartContractCodeGenerator";
import SmartContractHistoryEditModal from "./SmartContractHistoryEditModal";
import SmartContractCharges from "./SmartContractCharges";
import BasePointPaymentDetails from "@components/billing/BasePointPaymentDetails";

const { Text } = Typography;
const C = THEME_C;

const STATE_TAG: Record<ContractState, { color: string; label: string }> = {
  Off: { color: "default", label: "Not activated" },
  Scheduled: { color: "blue", label: "Scheduled" },
  Active: { color: "green", label: "Active" },
  Due: { color: "gold", label: "Payment due" },
  Grace: { color: "orange", label: "Overdue — grace period" },
  Restricted: { color: "volcano", label: "Restricted" },
  Locked: { color: "red", label: "Locked" },
};

const ACTION_LABEL: Record<ContractActivation["action"], string> = {
  activate: "Activated",
  renew: "Renewed",
  reactivate: "Reactivated",
  extend: "Extended",
  disable: "Disabled",
};

type CodePreview = {
  a: ContractActivation["action"];
  f?: number;
  c?: string;
  p?: string;
  o?: string;
  m?: number;
};

// Reads the unsigned part of a code so the form can show what it will do.
// The API checks the signature; this is only a preview.
const previewCode = (code: string): CodePreview | null => {
  const parts = code.replace(/\s+/g, "").split(".");
  if (parts.length !== 3 || parts[0] !== "BGC1") return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as CodePreview;
  } catch {
    return null;
  }
};

type ActivationFormValues = {
  monthly_fee?: number;
  activation_date?: Dayjs;
  paid_until?: Dayjs;
  extend_until?: Dayjs;
  code: string;
  pin?: string;
};

// How BasePoint staff authorise a change: a code, or (on BasePoint machines)
// the BasePoint PIN directly
type AuthMethod = "code" | "pin";

// The 6-digit code card: reactivate / change fee / disable, or extend by days
type CodeMode = "reactivate" | "extend";

const feeInput = (disabled = false) => (
  <InputNumber<number>
    min={0}
    step={500}
    disabled={disabled}
    style={{ width: "100%" }}
    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
    parser={(v) => Number((v || "").replace(/,/g, ""))}
    placeholder="e.g. 3,000"
  />
);

const codeInput = (
  <Input.TextArea
    rows={4}
    placeholder="BGC1.…"
    autoComplete="off"
    spellCheck={false}
    style={{ fontFamily: "monospace", fontSize: 12 }}
  />
);

const feeRule = (skip: boolean) => ({
  validator: (_: unknown, value?: number) =>
    skip || (typeof value === "number" && value > 0)
      ? Promise.resolve()
      : Promise.reject(new Error("Enter how much the client pays per month")),
});

const AuthMethodToggle: React.FC<{ value: AuthMethod; onChange: (v: AuthMethod) => void }> = ({ value, onChange }) => (
  <Segmented
    size="small"
    value={value}
    onChange={(v) => onChange(v as AuthMethod)}
    options={[
      { label: "BasePoint PIN", value: "pin" },
      { label: "Code", value: "code" },
    ]}
    style={{ marginBottom: 12 }}
  />
);

const SmartContractSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activateForm] = Form.useForm<ActivationFormValues>();
  const [reactivateForm] = Form.useForm<ActivationFormValues>();
  const [codeMode, setCodeMode] = React.useState<CodeMode>("reactivate");
  const [reactivateMethodChoice, setReactivateMethod] = React.useState<AuthMethod | null>(null);
  const [activateMethodChoice, setActivateMethod] = React.useState<AuthMethod | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<ContractActivation | null>(null);

  const activateCode: string = Form.useWatch("code", activateForm) || "";
  const reactivateCode: string = Form.useWatch("code", reactivateForm) || "";
  const preview = previewCode(activateCode);
  const reactivatePreview = previewCode(reactivateCode);
  const typedDigitCode = isDigitCode(reactivateCode);
  const isDisableCode = preview?.a === "disable";
  const isActivateCode = preview?.a === "activate";
  const notReactivateCode = !!reactivatePreview && reactivatePreview.a !== "reactivate";

  const { data: status, isLoading } = useQuery({
    queryKey: CONTRACT_STATUS_KEY,
    queryFn: fetchContractStatus,
    refetchOnWindowFocus: false,
  });

  // On BasePoint machines the PIN is the default; elsewhere only codes work
  const pinAvailable = !!status?.generator_available;
  const reactivateMethod: AuthMethod = pinAvailable ? reactivateMethodChoice ?? "pin" : "code";
  const activateMethod: AuthMethod = pinAvailable ? activateMethodChoice ?? "pin" : "code";

  React.useEffect(() => {
    if (!status?.monthly_fee) return;
    activateForm.setFieldValue("monthly_fee", status.monthly_fee);
  }, [activateForm, status?.monthly_fee]);

  const activateMutation = useMutation({
    mutationFn: activateContract,
    onSuccess: (result) => {
      queryClient.setQueryData<ContractStatus>(CONTRACT_STATUS_KEY, result.status);
      activateForm.setFieldValue("code", undefined);
      reactivateForm.setFieldValue("code", undefined);
      message.success(result.message);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error?.response?.data?.message || "Activation failed");
    },
  });

  const handleActivate = async () => {
    const values = await activateForm.validateFields();
    activateMutation.mutate({
      code: values.code.trim(),
      monthly_fee: isDisableCode ? undefined : values.monthly_fee,
      activation_date: isActivateCode ? values.activation_date?.format("YYYY-MM-DD") : undefined,
    });
  };

  const pinMutation = useMutation({
    mutationFn: unlockContractWithPin,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_STATUS_KEY });
      activateForm.setFieldValue("pin", undefined);
      reactivateForm.setFieldValue("pin", undefined);
      message.success(result.message);
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // 403 (wrong PIN) is already shown by the request interceptor
      if (error?.response?.status !== 403) {
        message.error(error?.response?.data?.message || "Could not apply the change");
      }
    },
  });

  const handleActivateWithPin = async () => {
    const values = await activateForm.validateFields();
    pinMutation.mutate({
      pin: values.pin || "",
      mode: "activate",
      monthly_fee: values.monthly_fee,
      activation_date: values.activation_date?.format("YYYY-MM-DD"),
      paid_until: values.paid_until?.format("YYYY-MM-DD"),
    });
  };

  const handleReactivateWithPin = async () => {
    const values = await reactivateForm.validateFields();
    pinMutation.mutate(
      codeMode === "extend"
        ? { pin: values.pin || "", mode: "extend", extend_until: values.extend_until?.format("YYYY-MM-DD") }
        : { pin: values.pin || "", mode: "reactivate" }
    );
  };

  const handleReactivate = async () => {
    const values = await reactivateForm.validateFields();
    activateMutation.mutate(
      codeMode === "extend"
        ? { code: values.code.trim(), extend_until: values.extend_until?.format("YYYY-MM-DD") }
        : { code: values.code.trim() }
    );
  };

  // "Use on this install" from the generator: fill the matching form
  const useGeneratedCode = (generated: GeneratedCode) => {
    if (generated.action === "extend") {
      setCodeMode("extend");
      reactivateForm.setFieldsValue({
        code: generated.short_code || generated.code,
        extend_until: generated.paid_until ? dayjs(generated.paid_until.slice(0, 10)) : undefined,
      });
    } else if (generated.action === "reactivate") {
      setCodeMode("reactivate");
      reactivateForm.setFieldsValue({ code: generated.short_code || generated.code });
    } else {
      activateForm.setFieldsValue({
        code: generated.code,
        monthly_fee: generated.monthly_fee ?? undefined,
        activation_date: generated.activation_date ? dayjs(generated.activation_date) : undefined,
      });
    }
    message.info("Code filled in — check the details and apply it.");
  };

  const stateTag = status ? STATE_TAG[status.state] : null;
  const currency = status?.currency || "KES";

  const activatePreviewText = (p: CodePreview) => {
    switch (p.a) {
      case "disable":
        return "This code turns the smart contract off.";
      case "reactivate":
        return "This is a reactivation code — use the Reactivate form.";
      case "activate":
        return `This code activates the contract from ${formatPaidUntil(p.o)} at ${formatMoney(p.f, p.c || currency)} per month, paid until ${formatPaidUntil(p.p)}.`;
      default:
        return `This code sets the fee to ${formatMoney(p.f, p.c || currency)} and access paid until ${formatPaidUntil(p.p)}.`;
    }
  };

  const historyColumns = [
    {
      title: "Date",
      dataIndex: "activated_at",
      key: "activated_at",
      // An activation is dated from its activation date, which can be in the
      // past (service that started earlier); the entry time is shown under it
      render: (v: string, row: ContractActivation) => {
        const shownDate = historyDateOf(row);
        const backdated = shownDate !== dayjs(v).format("YYYY-MM-DD");
        return backdated ? (
          <>
            <Text style={{ fontSize: 12, display: "block" }}>{formatPaidUntil(shownDate)}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>entered {dayjs(v).format("DD MMM YYYY, HH:mm")}</Text>
          </>
        ) : (
          <Text style={{ fontSize: 12 }}>{dayjs(v).format("DD MMM YYYY, HH:mm")}</Text>
        );
      },
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (v: ContractActivation["action"], row: ContractActivation) => (
        <>
          <Tag>{ACTION_LABEL[v]}</Tag>
          {row.edited_at && (
            <Tag color="purple" title={`Edited ${dayjs(row.edited_at).format("DD MMM YYYY, HH:mm")}${row.edited_by ? ` by ${row.edited_by}` : ""}`}>
              Edited
            </Tag>
          )}
          {row.note && (
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{row.note}</Text>
          )}
        </>
      ),
    },
    {
      title: "Monthly fee",
      key: "fee",
      render: (_: unknown, row: ContractActivation) => (
        <Text style={{ fontSize: 12 }}>
          {formatMoney(row.monthly_fee, currency)}
          {row.previous_fee != null && row.previous_fee !== row.monthly_fee && (
            <Text type="secondary" style={{ fontSize: 11 }}> (was {formatMoney(row.previous_fee, currency)})</Text>
          )}
        </Text>
      ),
    },
    {
      title: "Paid until",
      dataIndex: "paid_until",
      key: "paid_until",
      render: (v: string | null, row: ContractActivation) => (
        <Text style={{ fontSize: 12 }}>
          {formatPaidUntil(v)}
          {row.previous_paid_until && row.previous_paid_until.slice(0, 10) !== v?.slice(0, 10) && (
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              was {formatPaidUntil(row.previous_paid_until)}
            </Text>
          )}
        </Text>
      ),
    },
    {
      title: "By",
      dataIndex: "activated_by",
      key: "activated_by",
      render: (v: string | null) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text>,
    },
    ...(status?.history_edit_available
      ? [
          {
            title: "",
            key: "edit",
            width: 48,
            render: (_: unknown, row: ContractActivation) => (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label="Edit history entry"
                onClick={() => setEditingEntry(row)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Card style={{ maxWidth: 1500, margin: "0 auto", borderRadius: 8 }} styles={{ body: { padding: 24 } }}>
      <Row gutter={24}>
        {/* Left — current agreement */}
        <Col xs={24} lg={13}>
          <ProCard bordered title="Smart Contract" loading={isLoading} style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
              <SafetyCertificateOutlined style={{ color: C.primary, marginRight: 6 }} />
              Your monthly service agreement with BasePoint. Payment is due by day{" "}
              {status?.terms?.due_day ?? 5} of each month. Changes are made with a
              code from BasePoint support.
            </Text>

            {status?.clock_warning && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="The computer's date was set back. Contract dates use the latest date this system has seen."
              />
            )}

            {status && (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Status">
                  {stateTag && <Tag color={stateTag.color}>{stateTag.label}</Tag>}
                  {status.state === "Scheduled" && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      starts {formatPaidUntil(status.activated_on)}
                    </Text>
                  )}
                  {status.state === "Due" && status.days_until_due != null && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {status.days_until_due === 0 ? "due today" : `${status.days_until_due} day(s) left`}
                    </Text>
                  )}
                  {!!status.days_overdue && (
                    <Text type="danger" style={{ fontSize: 12 }}>{status.days_overdue} day(s) overdue</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Monthly fee">
                  {formatMoney(status.monthly_fee, currency)}
                </Descriptions.Item>
                <Descriptions.Item label="Activation date">{formatPaidUntil(status.activated_on)}</Descriptions.Item>
                <Descriptions.Item label="Paid until">{formatPaidUntil(status.paid_until)}</Descriptions.Item>
                <Descriptions.Item label="Terms">
                  <Text style={{ fontSize: 12 }}>
                    Due day {status.terms?.due_day ?? 5} · {status.terms?.grace_days ?? 5} grace day(s) ·
                    then {status.terms?.restricted_days ?? 5} restricted day(s) before locking
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Account / tenant code">
                  <Text copyable>{status.tenant_code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Install ID">
                  <Text copyable code>{status.install_id}</Text>
                </Descriptions.Item>
              </Descriptions>
            )}
          </ProCard>

          {status && <SmartContractCharges status={status} />}

          {status?.enabled && (
            <ProCard bordered title="How to pay" style={{ marginBottom: 16 }}>
              <BasePointPaymentDetails {...paymentDetailProps(status)} />
            </ProCard>
          )}

          <ProCard bordered title="Activation history">
            {status?.activations?.length ? (
              <Table
                size="small"
                rowKey="index"
                columns={historyColumns}
                dataSource={status.activations}
                pagination={{ pageSize: 6, hideOnSinglePage: true }}
                scroll={{ x: true }}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activations yet" />
            )}
          </ProCard>
        </Col>

        {/* Right — codes from BasePoint support */}
        <Col xs={24} lg={11}>
          {status?.generator_available && (
            <SmartContractCodeGenerator status={status} onUse={useGeneratedCode} />
          )}

          {status?.enabled && (
            <ProCard
              bordered
              title={reactivateMethod === "pin" ? "Reactivate or extend" : "Enter 6-digit code"}
              extra={<Tag color="blue">BasePoint support only</Tag>}
              style={{ marginBottom: 16 }}
            >
              {pinAvailable && (
                <AuthMethodToggle value={reactivateMethod} onChange={setReactivateMethod} />
              )}
              <Segmented
                block
                value={codeMode}
                onChange={(v) => setCodeMode(v as CodeMode)}
                options={[
                  { label: reactivateMethod === "pin" ? "Reactivate" : "Reactivate / disable", value: "reactivate" },
                  { label: "Extend days", value: "extend" },
                ]}
                style={{ marginBottom: 12 }}
              />
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                {reactivateMethod === "pin"
                  ? codeMode === "extend"
                    ? "Gives extra days, e.g. 5 days from today while a payment clears."
                    : "Reactivates for the next period once the month is paid."
                  : codeMode === "extend"
                    ? "Gives extra days, e.g. 5 days from today while a payment clears. Enter the date BasePoint gave with the code."
                    : "Once the month is paid, BasePoint support types the 6-digit code here to reactivate for the next period. The same box takes disable codes."}
                {reactivateMethod === "code" && " Each code works once, on this install only."}
              </Text>
              <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
                <Descriptions.Item label="Paid until now">{formatPaidUntil(status.paid_until)}</Descriptions.Item>
                {codeMode === "reactivate" && (
                  <Descriptions.Item label="After reactivation">
                    <Text strong>
                      {formatPaidUntil(status.next_period_paid_until)}
                      {reactivatePreview?.a === "reactivate" && (reactivatePreview.m ?? 1) > 1 && (
                        <Text type="secondary"> (+{reactivatePreview.m} periods)</Text>
                      )}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Form form={reactivateForm} layout="vertical" initialValues={{ extend_until: dayjs().add(5, "day") }}>
                {codeMode === "extend" && (
                  <Form.Item
                    name="extend_until"
                    label="Extend until"
                    tooltip="The date BasePoint gave with the code (5 days from today by default)."
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: "Pick the extension date" }]}
                  >
                    <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                )}
                {reactivateMethod === "pin" ? (
                  <Form.Item
                    name="pin"
                    label="BasePoint PIN"
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: "Enter the BasePoint PIN" }]}
                  >
                    <Input.Password autoComplete="new-password" inputMode="numeric" />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="code"
                    label="6-digit code"
                    tooltip="Type the 6-digit code from BasePoint, or paste a full code."
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: "Type the 6-digit code" }]}
                  >
                    <Input
                      size="large"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: typedDigitCode ? 6 : 0 }}
                    />
                  </Form.Item>
                )}
              </Form>

              {reactivateMethod === "code" && !status.short_codes && typedDigitCode && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="This install was activated before 6-digit codes existed. Activate it again once with a full code to enable them."
                />
              )}
              {reactivateMethod === "code" && reactivateCode && !reactivatePreview && !typedDigitCode && reactivateCode.length > 7 && (
                <Alert type="error" showIcon style={{ marginBottom: 12 }} message="This doesn't look like a BasePoint code." />
              )}
              {reactivateMethod === "code" && codeMode === "reactivate" && notReactivateCode && (
                <Alert type="error" showIcon style={{ marginBottom: 12 }} message="This full code is not a reactivation code — use the Activate form below." />
              )}

              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={reactivateMethod === "pin" ? pinMutation.isPending : activateMutation.isPending}
                disabled={reactivateMethod === "code" && notReactivateCode}
                onClick={reactivateMethod === "pin" ? handleReactivateWithPin : handleReactivate}
              >
                {codeMode === "extend" ? "Extend" : "Reactivate"}
              </Button>
            </ProCard>
          )}

          <ProCard bordered title={status?.enabled ? "Activate or change" : "Activate"}>
            {pinAvailable && <AuthMethodToggle value={activateMethod} onChange={setActivateMethod} />}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
              {activateMethod === "pin"
                ? "Activates this install with the BasePoint PIN. Activation date can be in the past; leave Paid until empty for the 5th of the following month."
                : "BasePoint support issues a code for this install ID. Enter the monthly fee the client pays and the activation date — both must match the code."}
            </Text>

            <Form form={activateForm} layout="vertical" initialValues={{ activation_date: dayjs() }}>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="monthly_fee"
                    label={`Monthly fee (${currency})`}
                    style={{ marginBottom: 12 }}
                    rules={[feeRule(activateMethod === "code" && isDisableCode)]}
                  >
                    {feeInput(activateMethod === "code" && isDisableCode)}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="activation_date"
                    label="Activation date"
                    tooltip="The day the agreement takes effect. Nothing is enforced before it."
                    style={{ marginBottom: 12 }}
                    rules={[{ required: activateMethod === "pin" || isActivateCode, message: "Pick the activation date" }]}
                  >
                    <DatePicker
                      format="DD MMM YYYY"
                      disabled={activateMethod === "code" && !!preview && !isActivateCode}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                {activateMethod === "pin" && (
                  <>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="paid_until"
                        label="Paid until (optional)"
                        tooltip="When the first payment falls due. Leave empty for the 5th of the month after the activation date."
                        style={{ marginBottom: 12 }}
                      >
                        <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} placeholder="5th of next month" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="pin"
                        label="BasePoint PIN"
                        style={{ marginBottom: 12 }}
                        rules={[{ required: true, message: "Enter the BasePoint PIN" }]}
                      >
                        <Input.Password autoComplete="new-password" inputMode="numeric" />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>
              {activateMethod === "code" && (
                <Form.Item
                  name="code"
                  label="Activation code"
                  style={{ marginBottom: 12 }}
                  rules={[{ required: true, message: "Paste the activation code" }]}
                >
                  {codeInput}
                </Form.Item>
              )}
            </Form>

            {activateMethod === "code" && activateCode && !preview && (
              <Alert type="error" showIcon style={{ marginBottom: 12 }} message="This doesn't look like an activation code." />
            )}
            {activateMethod === "code" && preview && (
              <Alert
                type={isDisableCode || preview.a === "reactivate" ? "warning" : "info"}
                showIcon
                style={{ marginBottom: 12 }}
                message={activatePreviewText(preview)}
              />
            )}

            <Button
              type="primary"
              icon={<KeyOutlined />}
              loading={activateMethod === "pin" ? pinMutation.isPending : activateMutation.isPending}
              disabled={activateMethod === "code" && preview?.a === "reactivate"}
              onClick={activateMethod === "pin" ? handleActivateWithPin : handleActivate}
            >
              {activateMethod === "pin" || isActivateCode || !status?.enabled ? "Activate" : "Apply code"}
            </Button>
          </ProCard>
        </Col>
      </Row>
      <SmartContractHistoryEditModal
        entry={editingEntry}
        isCurrent={!!editingEntry && editingEntry.index === status?.current_entry_index}
        onClose={() => setEditingEntry(null)}
      />
    </Card>
  );
};

export default SmartContractSettings;
