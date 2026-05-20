import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, message, Drawer, Descriptions } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDeductionRules, createDeductionRule, updateDeductionRule, deleteDeductionRule, getDeductionRuleById } from "@services/hr";

const { Title } = Typography;
const { Option } = Select;

const DeductionRulesList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["hr-deduction-rules"],
    queryFn: () => fetchDeductionRules(),
  });

  const rules = Array.isArray(rulesData) ? rulesData : rulesData?.rules || [];

  const { data: ruleDetail } = useQuery({
    queryKey: ["hr-deduction-rule", selectedRuleId],
    queryFn: () => getDeductionRuleById(selectedRuleId),
    enabled: !!selectedRuleId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createDeductionRule,
    onSuccess: () => {
      message.success("Deduction rule created successfully");
      setIsModalVisible(false);
      form.resetFields();
      setEditingRule(null);
      queryClient.invalidateQueries({ queryKey: ["hr-deduction-rules"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create deduction rule");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDeductionRule(id, data),
    onSuccess: () => {
      message.success("Deduction rule updated successfully");
      setIsModalVisible(false);
      form.resetFields();
      setEditingRule(null);
      queryClient.invalidateQueries({ queryKey: ["hr-deduction-rules"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update deduction rule");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeductionRule,
    onSuccess: () => {
      message.success("Deduction rule deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-deduction-rules"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to delete deduction rule");
    },
  });

  const columns = [
    {
      title: "Rule Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          PAYE: "red",
          NHIF: "blue",
          NSSF: "green",
          "Housing Levy": "purple",
          Other: "orange",
        };
        return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
      },
    },
    {
      title: "Rate (%)",
      dataIndex: "rate",
      key: "rate",
      render: (rate: number) => `${rate}%`,
    },
    {
      title: "Fixed Amount",
      dataIndex: "fixed_amount",
      key: "fixed_amount",
      render: (amount: number) => `KES ${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Max Amount",
      dataIndex: "max_amount",
      key: "max_amount",
      render: (amount: number) => `KES ${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewRule(record._id)}>
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRule(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteMutation.mutate(record._id)}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = (values: any) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleViewRule = (id: string) => {
    setSelectedRuleId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedRuleId("");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Deduction Rules
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-deduction-rules"] })}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add Rule
            </Button>
          </Space>
        </div>

        <Table columns={columns} dataSource={rules} loading={isLoading} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingRule ? "Edit Deduction Rule" : "Add Deduction Rule"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRule(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Option value="PAYE">PAYE</Option>
              <Option value="NHIF">NHIF</Option>
              <Option value="NSSF">NSSF</Option>
              <Option value="Housing Levy">Housing Levy</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="rate" label="Rate (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="fixed_amount" label="Fixed Amount">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="max_amount" label="Max Amount">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Deduction Rule Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {ruleDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Rule Name" span={2}>
              {ruleDetail.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Rule Type">
              {ruleDetail.rule_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={ruleDetail.is_active ? "green" : "red"}>
                {ruleDetail.is_active ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Fixed Amount">
              {ruleDetail.fixed_amount ? `KES ${ruleDetail.fixed_amount.toLocaleString()}` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Percentage Rate">
              {ruleDetail.percentage_rate ? `${ruleDetail.percentage_rate}%` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              {ruleDetail.priority || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Effective From">
              {ruleDetail.effective_from ? dayjs(ruleDetail.effective_from).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Notes" span={2}>
              {ruleDetail.notes || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default DeductionRulesList;
