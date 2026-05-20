import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Input, Modal, Form, message, Drawer, Descriptions, Upload } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBanks, createBank, updateBank, deleteBank, getBankById, importBanks, downloadBankTemplate, Bank } from "@services/hr";
import type { UploadFile } from "antd/es/upload/interface";

const { Title } = Typography;

const BanksList: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  const { data: banksData, isLoading, refetch } = useQuery({
    queryKey: ["hr-banks", { search: searchText }],
    queryFn: () => fetchBanks({ search: searchText }),
  });

  const banks = Array.isArray(banksData) ? banksData : banksData?.banks || [];

  const { data: bankDetail } = useQuery({
    queryKey: ["hr-bank", selectedBankId],
    queryFn: () => getBankById(selectedBankId),
    enabled: !!selectedBankId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createBank,
    onSuccess: () => {
      message.success("Bank created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create bank");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bank> }) => updateBank(id, data),
    onSuccess: () => {
      message.success("Bank updated successfully");
      setIsEditDrawerVisible(false);
      editForm.resetFields();
      setSelectedBankId("");
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update bank");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBank,
    onSuccess: () => {
      message.success("Bank deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to delete bank");
    },
  });

  const importMutation = useMutation({
    mutationFn: importBanks,
    onSuccess: (data) => {
      message.success(`Import completed: ${data.successful} banks imported, ${data.failed} failed`);
      setFileList([]);
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to import banks");
    },
  });

  const handleCreate = (values: any) => {
    createMutation.mutate(values);
  };

  const handleEditBank = (record: Bank) => {
    setSelectedBankId(record._id);
    editForm.setFieldsValue(record);
    setIsEditDrawerVisible(true);
  };

  const handleUpdate = (values: any) => {
    updateMutation.mutate({ id: selectedBankId, data: values });
  };

  const handleDeleteBank = (id: string) => {
    Modal.confirm({
      title: "Delete Bank",
      content: "Are you sure you want to delete this bank?",
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleViewBank = (id: string) => {
    setSelectedBankId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBankTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bank_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Template downloaded successfully");
    } catch (error) {
      message.error("Failed to download template");
    }
  };

  const handleImport = async (file: File) => {
    setFileList([{
      uid: "-1",
      name: file.name,
      status: "uploading",
    }]);
    try {
      await importMutation.mutateAsync(file);
      setFileList([]);
    } catch (error) {
      setFileList([]);
    }
    return false;
  };

  const columns = [
    {
      title: "Bank Code",
      dataIndex: "bank_code",
      key: "bank_code",
    },
    {
      title: "Bank Name",
      dataIndex: "bank_name",
      key: "bank_name",
    },
    {
      title: "Branch",
      dataIndex: "bank_branch",
      key: "bank_branch",
    },
    {
      title: "SWIFT Code",
      dataIndex: "swift_code",
      key: "swift_code",
      render: (code: string) => code || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string) => phone || "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => email || "-",
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Bank) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewBank(record._id)}>
            View
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditBank(record)}>
            Edit
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBank(record._id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>
            Banks
          </Title>
          <Space>
            <Input
              placeholder="Search banks..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Upload
              fileList={fileList}
              beforeUpload={handleImport}
              showUploadList={false}
              accept=".xlsx,.xls"
            >
              <Button icon={<UploadOutlined />} loading={importMutation.isPending}>
                Import Banks
              </Button>
            </Upload>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add Bank
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={banks}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: banksData?.total || 0,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} banks`,
          }}
        />
      </Card>

      <Modal
        title="Add Bank"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="bank_code" label="Bank Code" rules={[{ required: true }]}>
            <Input placeholder="e.g., KCB" />
          </Form.Item>
          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Kenya Commercial Bank" />
          </Form.Item>
          <Form.Item name="bank_branch" label="Branch" rules={[{ required: true }]}>
            <Input placeholder="e.g., Nairobi Branch" />
          </Form.Item>
          <Form.Item name="swift_code" label="SWIFT Code">
            <Input placeholder="e.g., KCBLKENX" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="e.g., +254 123 456 789" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="e.g., info@kcb.co.ke" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input placeholder="e.g., Nairobi" />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Input placeholder="e.g., Kenya" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Bank Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={() => {
          setIsDetailDrawerVisible(false);
          setSelectedBankId("");
        }}
      >
        {bankDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Bank Code">{bankDetail.bank_code}</Descriptions.Item>
            <Descriptions.Item label="Bank Name">{bankDetail.bank_name}</Descriptions.Item>
            <Descriptions.Item label="Branch">{bankDetail.bank_branch}</Descriptions.Item>
            <Descriptions.Item label="SWIFT Code">{bankDetail.swift_code || "-"}</Descriptions.Item>
            <Descriptions.Item label="Phone">{bankDetail.phone || "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{bankDetail.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>{bankDetail.address || "-"}</Descriptions.Item>
            <Descriptions.Item label="City">{bankDetail.city || "-"}</Descriptions.Item>
            <Descriptions.Item label="Country">{bankDetail.country || "-"}</Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={bankDetail.active ? "green" : "red"}>
                {bankDetail.active ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Edit Bank"
        placement="right"
        width={720}
        open={isEditDrawerVisible}
        onClose={() => {
          setIsEditDrawerVisible(false);
          editForm.resetFields();
          setSelectedBankId("");
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="bank_code" label="Bank Code" rules={[{ required: true }]}>
            <Input placeholder="e.g., KCB" />
          </Form.Item>
          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Kenya Commercial Bank" />
          </Form.Item>
          <Form.Item name="bank_branch" label="Branch" rules={[{ required: true }]}>
            <Input placeholder="e.g., Nairobi Branch" />
          </Form.Item>
          <Form.Item name="swift_code" label="SWIFT Code">
            <Input placeholder="e.g., KCBLKENX" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="e.g., +254 123 456 789" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="e.g., info@kcb.co.ke" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input placeholder="e.g., Nairobi" />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Input placeholder="e.g., Kenya" />
          </Form.Item>
          <Form.Item name="active" label="Status" valuePropName="checked">
            <input type="checkbox" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsEditDrawerVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Update Bank
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default BanksList;
