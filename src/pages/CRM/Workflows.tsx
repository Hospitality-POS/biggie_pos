import React, { useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  message,
  Row,
  Col,
  Switch,
  InputNumber,
  Divider,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  PhoneOutlined,
  MessageOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  trigger_condition: string;
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: string;
}

interface WorkflowAction {
  type: "call" | "sms" | "whatsapp" | "delay";
  delay_minutes?: number;
  phone_number?: string;
  message_template?: string;
}

const Workflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Trigger",
      dataIndex: "trigger",
      key: "trigger",
      render: (trigger: string) => <Tag color="blue">{trigger}</Tag>,
    },
    {
      title: "Condition",
      dataIndex: "trigger_condition",
      key: "trigger_condition",
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      render: (actions: WorkflowAction[]) => (
        <Space size={4}>
          {actions.map((action, idx) => (
            <Tag key={idx} color={action.type === "call" ? "green" : action.type === "sms" ? "blue" : action.type === "whatsapp" ? "cyan" : "orange"}>
              {action.type === "call" && <PhoneOutlined />}
              {action.type === "sms" && <MessageOutlined />}
              {action.type === "whatsapp" && "WhatsApp"}
              {action.type === "delay" && `Delay ${action.delay_minutes}m`}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Active" : "Paused"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Workflow) => (
        <Space size="8">
          <Button
            icon={record.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => toggleWorkflow(record.id)}
            type="text"
          >
            {record.is_active ? "Pause" : "Start"}
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            type="text"
          >
            Edit
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            danger
            type="text"
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingWorkflow(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    form.setFieldsValue({
      name: workflow.name,
      trigger: workflow.trigger,
      trigger_condition: workflow.trigger_condition,
      actions: workflow.actions,
      is_active: workflow.is_active,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Delete Workflow",
      content: "Are you sure you want to delete this workflow?",
      onOk: () => {
        setWorkflows(workflows.filter((w) => w.id !== id));
        message.success("Workflow deleted successfully");
      },
    });
  };

  const toggleWorkflow = (id: string) => {
    setWorkflows(
      workflows.map((w) =>
        w.id === id ? { ...w, is_active: !w.is_active } : w
      )
    );
    message.success("Workflow status updated");
  };

  const handleSubmit = (values: any) => {
    if (editingWorkflow) {
      setWorkflows(
        workflows.map((w) =>
          w.id === editingWorkflow.id ? { ...w, ...values } : w
        )
      );
      message.success("Workflow updated successfully");
    } else {
      const newWorkflow: Workflow = {
        id: Date.now().toString(),
        ...values,
        created_at: new Date().toISOString(),
      };
      setWorkflows([...workflows, newWorkflow]);
      message.success("Workflow created successfully");
    }
    setModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: "#8b5cf6", fontSize: 20 }} />
            <Title level={3} style={{ margin: 0 }}>
              Workflow Automation
            </Title>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Create Workflow
          </Button>
        }
      >
        <Alert
          message="Automate Communication"
          description="Create automated workflows to trigger calls, SMS, and WhatsApp messages based on lead events and conditions."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingWorkflow ? "Edit Workflow" : "Create Workflow"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingWorkflow(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {editingWorkflow ? "Update" : "Create"}
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Workflow Name"
            name="name"
            rules={[{ required: true, message: "Please enter workflow name" }]}
          >
            <Input placeholder="e.g., New Lead Follow-up" />
          </Form.Item>

          <Form.Item
            label="Trigger Event"
            name="trigger"
            rules={[{ required: true, message: "Please select trigger event" }]}
          >
            <Select placeholder="Select trigger">
              <Option value="lead_created">Lead Created</Option>
              <Option value="lead_status_changed">Lead Status Changed</Option>
              <Option value="lead_assigned">Lead Assigned</Option>
              <Option value="campaign_started">Campaign Started</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Trigger Condition"
            name="trigger_condition"
            rules={[{ required: true, message: "Please enter condition" }]}
          >
            <Input placeholder="e.g., status equals 'new'" />
          </Form.Item>

          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider orientation="left">Actions</Divider>

          <Form.List name="actions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      rules={[{ required: true }]}
                    >
                      <Select style={{ width: 120 }}>
                        <Option value="call">Call</Option>
                        <Option value="sms">SMS</Option>
                        <Option value="whatsapp">WhatsApp</Option>
                        <Option value="delay">Delay</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "phone_number"]}
                      rules={[{ required: false }]}
                    >
                      <Input placeholder="Phone number" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "delay_minutes"]}
                      rules={[{ required: false }]}
                    >
                      <InputNumber placeholder="Minutes" min={1} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "message_template"]}
                      rules={[{ required: false }]}
                    >
                      <Input.TextArea placeholder="Message template" rows={2} />
                    </Form.Item>
                    <Button onClick={() => remove(name)} danger icon={<DeleteOutlined />} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  Add Action
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default Workflows;
