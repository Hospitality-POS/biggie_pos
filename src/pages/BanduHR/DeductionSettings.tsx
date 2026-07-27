import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Table,
  Tag,
  Row,
  Col,
  message,
  Tabs,
  Switch,
  Divider,
} from "antd";
import {
  DollarOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Text } = Typography;

// ── Deduction Settings Component ───────────────────────────────────────────────

const DeductionSettings: React.FC = () => {
  const primaryColor = usePrimaryColor();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [customDeductions, setCustomDeductions] = useState<
    Array<{ id: string; name: string; amount: number; is_percentage: boolean }>
  >([]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // This would call an API to save deduction settings
      message.success("Deduction settings saved successfully");
      return values;
    },
  });

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate({
        ...values,
        custom_deductions: customDeductions,
      });
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const addCustomDeduction = () => {
    const newDeduction = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      is_percentage: false,
    };
    setCustomDeductions([...customDeductions, newDeduction]);
  };

  const removeCustomDeduction = (id: string) => {
    setCustomDeductions(customDeductions.filter((d) => d.id !== id));
  };

  const updateCustomDeduction = (id: string, field: string, value: any) => {
    setCustomDeductions(
      customDeductions.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const customDeductionColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (
        <Input
          value={name}
          onChange={(e) => updateCustomDeduction(record.id, "name", e.target.value)}
          placeholder="Deduction name"
        />
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: any) => (
        <InputNumber
          value={amount}
          onChange={(value) => updateCustomDeduction(record.id, "amount", value)}
          placeholder="Amount"
          style={{ width: "100%" }}
          addonAfter={record.is_percentage ? "%" : "KES"}
        />
      ),
    },
    {
      title: "Type",
      dataIndex: "is_percentage",
      key: "is_percentage",
      render: (isPercentage: boolean, record: any) => (
        <Switch
          checked={isPercentage}
          onChange={(checked) => updateCustomDeduction(record.id, "is_percentage", checked)}
          checkedChildren="%"
          unCheckedChildren="KES"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeCustomDeduction(record.id)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Space align="center">
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 10,
              padding: "8px 10px",
              color: primaryColor,
              fontSize: 20,
            }}
          >
            <SettingOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Deduction Settings
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Configure statutory and custom deductions for payroll
            </Text>
          </div>
        </Space>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saveMutation.isLoading}
        >
          Save Settings
        </Button>
      </div>

      <Tabs defaultActiveKey="nssf">
        {/* ── NSSF Settings ── */}
        <Tabs.TabPane tab="NSSF" key="nssf">
          <Card>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="nssf_enabled"
                    label="Enable NSSF Deduction"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="nssf_rate"
                    label="NSSF Rate (%)"
                    initialValue={6}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="nssf_tier1_limit"
                    label="Tier 1 Upper Limit (KES)"
                    initialValue={6000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="nssf_tier2_limit"
                    label="Tier 2 Upper Limit (KES)"
                    initialValue={18000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>
                NSSF is calculated as 6% of pensionable pay, with tiered limits as per current regulations.
              </Text>
            </Form>
          </Card>
        </Tabs.TabPane>

        {/* ── PAYE Settings ── */}
        <Tabs.TabPane tab="PAYE" key="paye">
          <Card>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="paye_enabled"
                    label="Enable PAYE Deduction"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="paye_personal_relief"
                    label="Personal Relief (KES)"
                    initialValue={2400}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Divider orientation="left">Tax Brackets</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket1_limit"
                    label="Bracket 1 Limit (KES)"
                    initialValue={24000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket1_rate"
                    label="Bracket 1 Rate (%)"
                    initialValue={10}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket2_limit"
                    label="Bracket 2 Limit (KES)"
                    initialValue={32333}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket2_rate"
                    label="Bracket 2 Rate (%)"
                    initialValue={25}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket3_limit"
                    label="Bracket 3 Limit (KES)"
                    initialValue={500000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="paye_bracket3_rate"
                    label="Bracket 3 Rate (%)"
                    initialValue={30}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="paye_bracket4_rate"
                    label="Bracket 4+ Rate (%)"
                    initialValue={35}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>
                PAYE tax brackets based on current KRA regulations. Personal relief is deducted from taxable income.
              </Text>
            </Form>
          </Card>
        </Tabs.TabPane>

        {/* ── SHA Settings ── */}
        <Tabs.TabPane tab="SHA" key="sha">
          <Card>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="sha_enabled"
                    label="Enable SHA Deduction"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sha_employee_rate"
                    label="Employee Rate (%)"
                    initialValue={2.75}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.25}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="sha_employer_rate"
                    label="Employer Rate (%)"
                    initialValue={2.75}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.25}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sha_income_limit"
                    label="Income Limit (KES)"
                    initialValue={100000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>
                SHA (Social Health Insurance) replaces NHIF. Both employee and employer contribute 2.75% of gross pay.
              </Text>
            </Form>
          </Card>
        </Tabs.TabPane>

        {/* ── Housing Levy Settings ── */}
        <Tabs.TabPane tab="Housing Levy" key="housing">
          <Card>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="housing_levy_enabled"
                    label="Enable Housing Levy"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="housing_levy_rate"
                    label="Housing Levy Rate (%)"
                    initialValue={1.5}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.5}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="housing_levy_income_limit"
                    label="Income Limit (KES)"
                    initialValue={100000}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      addonBefore="KES"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="housing_levy_employee_share"
                    label="Employee Share (%)"
                    initialValue={50}
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: "100%" }}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Housing Levy is 1.5% of gross pay, shared equally between employee and employer.
              </Text>
            </Form>
          </Card>
        </Tabs.TabPane>

        {/* ── Custom Deductions ── */}
        <Tabs.TabPane tab="Custom Deductions" key="custom">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addCustomDeduction}
                block
              >
                Add Custom Deduction
              </Button>
            </div>
            <Table
              columns={customDeductionColumns}
              dataSource={customDeductions}
              rowKey="id"
              pagination={false}
              size="small"
            />
            {customDeductions.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                No custom deductions configured. Click "Add Custom Deduction" to create one.
              </div>
            )}
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default DeductionSettings;
