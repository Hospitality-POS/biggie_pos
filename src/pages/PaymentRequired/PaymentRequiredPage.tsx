import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Collapse,
  DatePicker,
  Form,
  Input,
  Segmented,
  Skeleton,
  Typography,
  message,
} from "antd";
import { CreditCardOutlined, CheckCircleOutlined, KeyOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  fetchPublicContractStatus,
  unlockContract,
  unlockContractWithPin,
  formatPaidUntil,
  paymentDetailProps,
  PublicContractStatus,
} from "@services/smartContract";
import BasePointPaymentDetails from "@components/billing/BasePointPaymentDetails";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const C = THEME_C;

const PUBLIC_STATUS_KEY = ["contractPublicStatus"];

type CodeMode = "reactivate" | "extend";
type UnlockValues = { extend_until?: Dayjs; code: string };
type PinValues = { extend_until?: Dayjs; pin: string };

const getCompanyName = () => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "null");
    return tenant?.name || tenant?.company_name || tenant?.tenant_name || "";
  } catch {
    return "";
  }
};

/**
 * Shown instead of the app when the BasePoint payment is overdue past the
 * restricted stage (402, code CONTRACT_LOCKED) — at sign-in or mid-session.
 * Nobody can sign in until BasePoint support enters a code here.
 */
const PaymentRequiredPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UnlockValues>();
  const [mode, setMode] = React.useState<CodeMode>("reactivate");
  const [pinForm] = Form.useForm<PinValues>();
  const company = getCompanyName();

  const { data: status, isLoading, isError } = useQuery({
    queryKey: PUBLIC_STATUS_KEY,
    queryFn: fetchPublicContractStatus,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const unlockMutation = useMutation({
    mutationFn: unlockContract,
    onSuccess: (result) => {
      queryClient.setQueryData<PublicContractStatus>(PUBLIC_STATUS_KEY, result.status);
      form.setFieldValue("code", undefined);
      message.success(result.message);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error?.response?.data?.message || "The code was not accepted");
    },
  });

  const pinMutation = useMutation({
    mutationFn: unlockContractWithPin,
    onSuccess: (result) => {
      queryClient.setQueryData<PublicContractStatus>(PUBLIC_STATUS_KEY, result.status);
      pinForm.setFieldValue("pin", undefined);
      message.success(result.message);
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // 403 (wrong PIN) is already shown by the request interceptor
      if (error?.response?.status !== 403) {
        message.error(error?.response?.data?.message || "Could not unlock");
      }
    },
  });

  const handlePinUnlock = async () => {
    const values = await pinForm.validateFields();
    pinMutation.mutate(
      mode === "extend"
        ? { pin: values.pin, mode, extend_until: values.extend_until?.format("YYYY-MM-DD") }
        : { pin: values.pin, mode }
    );
  };

  const handleUnlock = async () => {
    const values = await form.validateFields();
    unlockMutation.mutate(
      mode === "extend"
        ? { code: values.code.trim(), extend_until: values.extend_until?.format("YYYY-MM-DD") }
        : { code: values.code.trim() }
    );
  };

  const locked = status?.state === "Locked";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: C.bg,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#ffffff",
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${locked || !status ? "#ef4444" : "#10b981"}`,
          borderRadius: 14,
          padding: "28px 24px 24px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : isError || !status ? (
          <>
            <Title level={4} style={{ marginTop: 0 }}>Payment required</Title>
            <Text style={{ color: "#475569" }}>
              This system is locked because the BasePoint subscription is overdue. Contact BasePoint
              support to restore access.
            </Text>
            <Button block size="large" style={{ marginTop: 20 }} onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : !locked ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircleOutlined style={{ fontSize: 44, color: "#10b981" }} />
            <Title level={4} style={{ margin: "12px 0 4px" }}>Access restored</Title>
            <Text style={{ color: "#475569", display: "block", marginBottom: 20 }}>
              {status.paid_until
                ? `The system is paid until ${formatPaidUntil(status.paid_until)}. You can sign in again.`
                : "You can sign in again."}
            </Text>
            <Button type="primary" block size="large" onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fef2f2",
                  color: "#ef4444",
                  fontSize: 30,
                }}
              >
                <CreditCardOutlined />
              </div>
              <Title level={4} style={{ margin: 0, color: C.darkText }}>Payment required</Title>
              {company && (
                <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 4 }}>{company}</Text>
              )}
            </div>

            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Subscription renewal is ${status.days_overdue ?? 0} day(s) overdue.`}
              description="The system is locked and nobody can sign in until the payment is received and BasePoint reactivates it. Your data is safe."
            />

            <BasePointPaymentDetails {...paymentDetailProps(status)} />
            <Text type="secondary" style={{ fontSize: 12, display: "block", margin: "12px 0 16px" }}>
              Use your account code as the payment reference, then call BasePoint support to reactivate.
            </Text>

            <Segmented
              block
              value={mode}
              onChange={(v) => setMode(v as CodeMode)}
              options={[
                { label: "Reactivate next period", value: "reactivate" },
                { label: "Extend days", value: "extend" },
              ]}
              style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              {mode === "reactivate" && status.next_period_paid_until
                ? `Reactivating moves paid-until from ${formatPaidUntil(status.paid_until)} to ${formatPaidUntil(status.next_period_paid_until)}.`
                : "Extending gives access until the date you pick, e.g. 5 days from today."}
            </Text>
            <Collapse
              size="small"
              defaultActiveKey={status.pin_unlock_available ? ["pin"] : []}
              items={[
                ...(status.pin_unlock_available
                  ? [
                      {
                        key: "pin",
                        label: (
                          <span>
                            <LockOutlined style={{ marginRight: 6 }} />
                            BasePoint staff — unlock with PIN
                          </span>
                        ),
                        children: (
                          <>
                            <Form
                              form={pinForm}
                              layout="vertical"
                              initialValues={{ extend_until: dayjs().add(5, "day") }}
                            >
                              {mode === "extend" && (
                                <Form.Item
                                  name="extend_until"
                                  label="Extend until"
                                  style={{ marginBottom: 12 }}
                                  rules={[{ required: true, message: "Pick the extension date" }]}
                                >
                                  <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
                                </Form.Item>
                              )}
                              <Form.Item
                                name="pin"
                                label="BasePoint PIN"
                                style={{ marginBottom: 12 }}
                                rules={[{ required: true, message: "Enter the BasePoint PIN" }]}
                              >
                                <Input.Password autoComplete="new-password" inputMode="numeric" />
                              </Form.Item>
                            </Form>
                            <Button type="primary" block loading={pinMutation.isPending} onClick={handlePinUnlock}>
                              {mode === "extend" ? "Extend and unlock" : "Reactivate and unlock"}
                            </Button>
                          </>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "code",
                  label: (
                    <span>
                      <KeyOutlined style={{ marginRight: 6 }} />
                      BasePoint support — enter 6-digit code
                    </span>
                  ),
                  children: (
                    <>
                      <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ extend_until: dayjs().add(5, "day") }}
                      >
                        {mode === "extend" && (
                          <Form.Item
                            name="extend_until"
                            label="Extend until"
                            style={{ marginBottom: 12 }}
                            rules={[{ required: true, message: "Pick the extension date" }]}
                          >
                            <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
                          </Form.Item>
                        )}
                        <Form.Item
                          name="code"
                          label="6-digit code"
                          extra="The code from the Generate code screen — not the PIN."
                          style={{ marginBottom: 12 }}
                          rules={[{ required: true, message: "Type the code from BasePoint" }]}
                        >
                          <Input
                            size="large"
                            placeholder="000000"
                            inputMode="numeric"
                            autoComplete="off"
                            style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 6 }}
                          />
                        </Form.Item>
                      </Form>
                      <Button type="primary" block loading={unlockMutation.isPending} onClick={handleUnlock}>
                        Unlock
                      </Button>
                    </>
                  ),
                },
              ]}
            />

            <Button type="link" block style={{ marginTop: 12 }} onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRequiredPage;
