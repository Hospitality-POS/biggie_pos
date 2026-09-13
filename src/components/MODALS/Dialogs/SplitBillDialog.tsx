import React, { useEffect, useState } from "react";
import { ModalForm, ProCard, ProFormDigit, ProFormSelect } from "@ant-design/pro-components";
import { Form, Row, Col, Typography, Space, Button, Tag, Alert } from "antd";
import {
  SplitCellsOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { formatCurrency } from "@utils/formatters";

interface SplitBillDialogProps {
  open: boolean;
  handleModalClose: () => void;
  data: Array<{ _id: string; name: string }>;
  selectedMethod: string | null;
  secondMethod: string | null;
  amount1: number;
  amount2: number;
  totalAmount: number;
  setSelectedMethod: (method: string) => void;
  setSecondMethod: (method: string) => void;
  setAmount1: (amount: number) => void;
  setAmount2: (amount: number) => void;
  handleSplitConfirm: (
    splitAmount1?: number,
    splitAmount2?: number,
    splitMethod1?: string,
    splitMethod2?: string
  ) => void | Promise<void>;
}

const splitHalf = (total: number): [number, number] => {
  const half = Math.round((total / 2) * 100) / 100;
  const rem = Math.round((total - half) * 100) / 100;
  return [half, rem];
};

const SplitBillDialog: React.FC<SplitBillDialogProps> = ({
  open,
  handleModalClose,
  data,
  selectedMethod,
  secondMethod,
  amount1,
  amount2,
  totalAmount,
  setSelectedMethod,
  setSecondMethod,
  setAmount1,
  setAmount2,
  handleSplitConfirm,
}) => {
  const primaryColor = usePrimaryColor() || "#6c1c2c";
  const [form] = Form.useForm();

  const [curAmount1, setCurAmount1] = useState<number>(amount1 || 0);
  const [curAmount2, setCurAmount2] = useState<number>(amount2 || 0);
  const [curMethod1, setCurMethod1] = useState<string | null>(selectedMethod);
  const [curMethod2, setCurMethod2] = useState<string | null>(secondMethod);

  // Initialize or re-sync when modal opens
  useEffect(() => {
    if (open) {
      let a1 = amount1;
      let a2 = amount2;
      if (!a1 && !a2) {
        const [half, rem] = splitHalf(totalAmount);
        a1 = half;
        a2 = rem;
      } else if (a1 && !a2) {
        a2 = Math.round((totalAmount - a1) * 100) / 100;
      } else if (!a1 && a2) {
        a1 = Math.round((totalAmount - a2) * 100) / 100;
      }

      const m1 = selectedMethod || data?.[0]?._id || null;
      const m2 = secondMethod || data?.find((d) => d._id !== m1)?._id || data?.[1]?._id || null;

      setCurAmount1(a1);
      setCurAmount2(a2);
      setCurMethod1(m1);
      setCurMethod2(m2);

      setAmount1(a1);
      setAmount2(a2);
      if (m1) setSelectedMethod(m1);
      if (m2) setSecondMethod(m2);

      form.setFieldsValue({
        selectedMethod: m1,
        secondMethod: m2,
        amount1: a1,
        amount2: a2,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, totalAmount]);

  const handleAmount1Change = (val: number | null) => {
    const num = val ?? 0;
    setCurAmount1(num);
    setAmount1(num);
    const rem = Math.max(0, Math.round((totalAmount - num) * 100) / 100);
    setCurAmount2(rem);
    setAmount2(rem);
    form.setFieldsValue({ amount2: rem });
  };

  const handleAmount2Change = (val: number | null) => {
    const num = val ?? 0;
    setCurAmount2(num);
    setAmount2(num);
    const rem = Math.max(0, Math.round((totalAmount - num) * 100) / 100);
    setCurAmount1(rem);
    setAmount1(rem);
    form.setFieldsValue({ amount1: rem });
  };

  const handleSplit5050 = () => {
    const [half, rem] = splitHalf(totalAmount);
    setCurAmount1(half);
    setCurAmount2(rem);
    setAmount1(half);
    setAmount2(rem);
    form.setFieldsValue({ amount1: half, amount2: rem });
  };

  const handleMethod1Change = (val: string) => {
    setCurMethod1(val);
    setSelectedMethod(val);
  };

  const handleMethod2Change = (val: string) => {
    setCurMethod2(val);
    setSecondMethod(val);
  };

  const method1Options = (data || []).map((method: { _id: string; name: string }) => ({
    label: method.name,
    value: method._id,
    disabled: method._id === curMethod2,
  }));

  const method2Options = (data || []).map((method: { _id: string; name: string }) => ({
    label: method.name,
    value: method._id,
    disabled: method._id === curMethod1,
  }));

  const isBalanced = Math.abs(curAmount1 + curAmount2 - totalAmount) < 0.01;
  const isValid =
    curAmount1 > 0 &&
    curAmount2 > 0 &&
    isBalanced &&
    !!curMethod1 &&
    !!curMethod2 &&
    curMethod1 !== curMethod2;

  return (
    <ModalForm
      title={
        <Space align="center" size={8}>
          <SplitCellsOutlined style={{ color: primaryColor, fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>Split Bill Payment</span>
        </Space>
      }
      open={open}
      form={form}
      width={540}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        maskClosable: false,
        onCancel: handleModalClose,
      }}
      onOpenChange={(visible) => {
        if (!visible) handleModalClose();
      }}
      onFinish={async (values) => {
        const a1 = Number(values.amount1 ?? curAmount1);
        const a2 = Number(values.amount2 ?? curAmount2);
        const m1 = values.selectedMethod ?? curMethod1;
        const m2 = values.secondMethod ?? curMethod2;

        setAmount1(a1);
        setAmount2(a2);
        if (m1) setSelectedMethod(m1);
        if (m2) setSecondMethod(m2);

        await handleSplitConfirm(a1, a2, m1, m2);
        return true;
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Confirm Split & Pay",
        },
        submitButtonProps: {
          disabled: !isValid,
          style: {
            backgroundColor: isValid ? primaryColor : undefined,
            borderColor: isValid ? primaryColor : undefined,
            color: "#ffffff",
          },
        },
        resetButtonProps: {
          onClick: handleModalClose,
        },
      }}
    >
      {/* Total bill header card */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Total Bill to Split
          </Typography.Text>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <Button
          size="small"
          type="dashed"
          onClick={handleSplit5050}
          style={{ borderColor: primaryColor, color: primaryColor, fontWeight: 600 }}
        >
          Split 50 / 50
        </Button>
      </div>

      {/* Two payment columns */}
      <Row gutter={16}>
        <Col span={12}>
          <ProCard
            size="small"
            title={
              <Space size={6}>
                <CreditCardOutlined style={{ color: primaryColor }} />
                <span>Payment 1</span>
              </Space>
            }
            style={{
              background: "#fafafa",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          >
            <ProFormSelect
              name="selectedMethod"
              label="Method"
              options={method1Options}
              placeholder="Select method"
              rules={[{ required: true, message: "Select method" }]}
              fieldProps={{
                onChange: handleMethod1Change,
              }}
            />
            <ProFormDigit
              name="amount1"
              label="Amount"
              min={1}
              max={totalAmount}
              placeholder="0.00"
              rules={[
                { required: true, message: "Enter amount" },
                {
                  validator: async (_, value) => {
                    if (value <= 0) throw new Error("Must be > 0");
                    if (value >= totalAmount) throw new Error("Must be < total");
                  },
                },
              ]}
              fieldProps={{
                style: { width: "100%" },
                precision: 2,
                prefix: "KES",
                onChange: handleAmount1Change,
              }}
            />
          </ProCard>
        </Col>

        <Col span={12}>
          <ProCard
            size="small"
            title={
              <Space size={6}>
                <WalletOutlined style={{ color: primaryColor }} />
                <span>Payment 2</span>
              </Space>
            }
            style={{
              background: "#fafafa",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          >
            <ProFormSelect
              name="secondMethod"
              label="Method"
              options={method2Options}
              placeholder="Select method"
              rules={[{ required: true, message: "Select method" }]}
              fieldProps={{
                onChange: handleMethod2Change,
              }}
            />
            <ProFormDigit
              name="amount2"
              label="Amount"
              min={1}
              max={totalAmount}
              placeholder="0.00"
              rules={[
                { required: true, message: "Enter amount" },
                {
                  validator: async (_, value) => {
                    if (value <= 0) throw new Error("Must be > 0");
                    if (value >= totalAmount) throw new Error("Must be < total");
                  },
                },
              ]}
              fieldProps={{
                style: { width: "100%" },
                precision: 2,
                prefix: "KES",
                onChange: handleAmount2Change,
              }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* Status banner */}
      <div style={{ marginTop: 16 }}>
        {isBalanced && curAmount1 > 0 && curAmount2 > 0 ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  Split matches total: <b>{formatCurrency(totalAmount)}</b>
                </span>
                <Tag color="success">Balanced</Tag>
              </div>
            }
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {curAmount1 + curAmount2 < totalAmount
                    ? `Remaining: ${formatCurrency(totalAmount - (curAmount1 + curAmount2))}`
                    : `Exceeds total by: ${formatCurrency(curAmount1 + curAmount2 - totalAmount)}`}
                </span>
                <Tag color="warning">
                  {formatCurrency(curAmount1 + curAmount2)} / {formatCurrency(totalAmount)}
                </Tag>
              </div>
            }
          />
        )}
      </div>
    </ModalForm>
  );
};

export default SplitBillDialog;